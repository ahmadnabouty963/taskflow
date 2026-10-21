import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api.js";
import { uploadFile } from "../lib/uploads.js";
import WhiteboardView from "./WhiteboardView.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));
vi.mock("../lib/uploads.js", () => ({ uploadFile: vi.fn() }));
vi.mock("@excalidraw/excalidraw/index.css", () => ({}));

const excalidrawProps = vi.hoisted(() => ({ current: null }));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: (props) => {
    excalidrawProps.current = props;
    return <div data-testid="excalidraw" />;
  },
}));

const rectangle = { id: "shape-1", type: "rectangle", version: 1 };

function mockWhiteboard({ canEdit = true, elements = [rectangle], version = 1, files = [], uploadsEnabled = false } = {}) {
  apiRequest.mockImplementation((path, options = {}) => {
    if (path === "/api/projects/project-1/whiteboard" && !options.method) {
      return Promise.resolve({
        data: { whiteboard: { elements, version, updatedBy: { id: "user-2", name: "Sara" } }, canEdit, files, uploadsEnabled },
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
  uploadFile.mockReset();
  excalidrawProps.current = null;
  vi.stubGlobal("fetch", vi.fn(async () => ({ blob: async () => new Blob(["png-bytes"], { type: "image/png" }) })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
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

describe("WhiteboardView images", () => {
  const image = { id: "image-1", type: "image", version: 1, fileId: "file-abc" };

  it("keeps the image tool off while uploads are unavailable", async () => {
    mockWhiteboard();
    render(<WhiteboardView projectId="project-1" />);

    await screen.findByTestId("excalidraw");
    expect(excalidrawProps.current.UIOptions.tools.image).toBe(false);
  });

  it("loads stored images into the whiteboard", async () => {
    mockWhiteboard({
      uploadsEnabled: true,
      elements: [image],
      files: [{ fileId: "file-abc", mimeType: "image/png", url: "https://files.example/abc" }],
    });
    render(<WhiteboardView projectId="project-1" />);

    await screen.findByTestId("excalidraw");
    expect(excalidrawProps.current.UIOptions.tools.image).toBe(true);
    expect(excalidrawProps.current.initialData.files["file-abc"]).toMatchObject({
      id: "file-abc",
      mimeType: "image/png",
      dataURL: expect.stringMatching(/^data:image\/png;base64,/),
    });
  });

  it("uploads a newly inserted image once and saves the image element", async () => {
    mockWhiteboard({ uploadsEnabled: true, elements: [] , version: 0 });
    uploadFile.mockResolvedValue({ id: "attachment-1" });
    render(<WhiteboardView projectId="project-1" />);
    await screen.findByTestId("excalidraw");

    const files = { "file-new": { id: "file-new", mimeType: "image/png", dataURL: "data:image/png;base64,AAAA" } };
    const newImage = { ...image, fileId: "file-new" };
    await act(async () => {
      excalidrawProps.current.onChange([newImage], {}, files);
      excalidrawProps.current.onChange([newImage], {}, files);
    });

    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1));
    expect(uploadFile.mock.calls[0][0]).toMatchObject({
      requestPath: "/api/projects/project-1/whiteboard/files",
      extra: { fileId: "file-new" },
    });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });
});
