import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api.js";
import WhiteboardView from "./WhiteboardView.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));
vi.mock("@excalidraw/excalidraw/index.css", () => ({}));

const excalidrawProps = vi.hoisted(() => ({ current: null }));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: (props) => {
    excalidrawProps.current = props;
    return <div data-testid="excalidraw" />;
  },
}));

const rectangle = { id: "shape-1", type: "rectangle", version: 1 };

function mockWhiteboard({ canEdit = true, elements = [rectangle], version = 1 } = {}) {
  apiRequest.mockImplementation((path, options = {}) => {
    if (path === "/api/projects/project-1/whiteboard" && !options.method) {
      return Promise.resolve({
        data: { whiteboard: { elements, version, updatedBy: { id: "user-2", name: "Sara" } }, canEdit },
      });
    }
    if (options.method === "PUT") {
      const body = JSON.parse(options.body);
      return Promise.resolve({
        data: { whiteboard: { elements: body.elements, version: body.baseVersion + 1, updatedBy: { id: "user-1", name: "Ahmad" } } },
      });
    }
    return Promise.reject(new Error("Unexpected request: " + path));
  });
}

beforeEach(() => {
  apiRequest.mockReset();
  excalidrawProps.current = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("WhiteboardView", () => {
  it("loads the saved drawing", async () => {
    mockWhiteboard();
    render(<WhiteboardView projectId="project-1" />);

    expect(await screen.findByTestId("excalidraw")).toBeInTheDocument();
    expect(excalidrawProps.current.initialData.elements).toEqual([rectangle]);
    expect(excalidrawProps.current.viewModeEnabled).toBe(false);
    expect(excalidrawProps.current.UIOptions.tools.image).toBe(false);
    expect(screen.getByText("Saved · last change by Sara")).toBeInTheDocument();
  });

  it("opens read-only for viewers", async () => {
    mockWhiteboard({ canEdit: false });
    render(<WhiteboardView projectId="project-1" />);

    await screen.findByTestId("excalidraw");
    expect(excalidrawProps.current.viewModeEnabled).toBe(true);
    expect(screen.getByText(/You can view this whiteboard/)).toBeInTheDocument();
  });

  it("autosaves changes after a pause and skips deleted elements and images", async () => {
    mockWhiteboard();
    render(<WhiteboardView projectId="project-1" />);
    await screen.findByTestId("excalidraw");
    vi.useFakeTimers();

    act(() => {
      excalidrawProps.current.onChange([
        { ...rectangle, version: 2 },
        { id: "gone", type: "rectangle", version: 1, isDeleted: true },
        { id: "picture", type: "image", version: 1 },
      ]);
    });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    const [, options] = apiRequest.mock.calls[1];
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({
      elements: [{ ...rectangle, version: 2 }],
      baseVersion: 1,
    });
    expect(screen.getByText("Saved · last change by Ahmad")).toBeInTheDocument();
  });

  it("does not save when nothing changed", async () => {
    mockWhiteboard();
    render(<WhiteboardView projectId="project-1" />);
    await screen.findByTestId("excalidraw");
    vi.useFakeTimers();

    act(() => excalidrawProps.current.onChange([rectangle]));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it("stops saving and offers to reload after a conflict", async () => {
    mockWhiteboard();
    render(<WhiteboardView projectId="project-1" />);
    await screen.findByTestId("excalidraw");
    const conflict = Object.assign(new Error("Conflict"), { status: 409, code: "WHITEBOARD_CONFLICT" });
    apiRequest.mockRejectedValueOnce(conflict);
    vi.useFakeTimers();

    act(() => excalidrawProps.current.onChange([{ ...rectangle, version: 3 }]));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(screen.getByText(/Someone else changed this whiteboard/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load latest version" })).toBeInTheDocument();
  });
});

describe("WhiteboardView while saving", () => {
  it("does not save the same drawing twice when it is reported during a save", async () => {
    let finishSave;
    mockWhiteboard();
    render(<WhiteboardView projectId="project-1" />);
    await screen.findByTestId("excalidraw");
    const loadImplementation = apiRequest.getMockImplementation();
    apiRequest.mockImplementation((path, options = {}) => {
      if (options.method !== "PUT") return loadImplementation(path, options);
      return new Promise((resolve) => {
        finishSave = () => resolve(loadImplementation(path, options));
      });
    });
    vi.useFakeTimers();
    const changed = [{ ...rectangle, version: 2 }];

    act(() => excalidrawProps.current.onChange(changed));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    act(() => excalidrawProps.current.onChange(changed));
    await act(async () => {
      finishSave();
      await vi.advanceTimersByTimeAsync(8000);
    });

    const saves = apiRequest.mock.calls.filter(([, options]) => options?.method === "PUT");
    expect(saves).toHaveLength(1);
    expect(screen.getByText("Saved · last change by Ahmad")).toBeInTheDocument();
  });
});
