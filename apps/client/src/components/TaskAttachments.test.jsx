import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api.js";
import { uploadFile } from "../lib/uploads.js";
import { TaskAttachments } from "./TaskAttachments.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));
vi.mock("../lib/uploads.js", async (importOriginal) => ({
  ...(await importOriginal()),
  uploadFile: vi.fn(),
}));

const basePath = "/api/projects/project-1/tasks/task-1";
const limits = { maxBytes: 10 * 1024 * 1024, contentTypes: ["application/pdf", "image/png"] };
const photo = {
  id: "file-1",
  fileName: "Wohnung.png",
  contentType: "image/png",
  size: 2048,
  isImage: true,
  canDelete: true,
  url: "https://files.example/inline",
  downloadUrl: "https://files.example/download",
  uploadedBy: { id: "user-2", name: "Sara" },
};

function mockList({ attachments = [photo], uploadsEnabled = true } = {}) {
  apiRequest.mockImplementation((path, options = {}) => {
    if (path === `${basePath}/attachments`) {
      return Promise.resolve({ data: { attachments, uploadsEnabled, limits } });
    }
    if (options.method === "DELETE") return Promise.resolve(null);
    return Promise.reject(new Error("Unexpected request: " + path));
  });
}

beforeEach(() => {
  apiRequest.mockReset();
  uploadFile.mockReset();
});

describe("Task attachments", () => {
  it("lists files with image previews", async () => {
    mockList();
    render(<TaskAttachments basePath={basePath} />);

    expect(await screen.findByText("Wohnung.png")).toBeInTheDocument();
    expect(screen.getByText("2 KB · Sara")).toBeInTheDocument();
    expect(document.querySelector(".task-attachments__thumb")).toHaveAttribute("src", photo.url);
    expect(screen.getByRole("link", { name: /Wohnung.png/ })).toHaveAttribute("href", photo.downloadUrl);
  });

  it("uploads a selected file and shows it", async () => {
    const user = userEvent.setup();
    mockList({ attachments: [] });
    uploadFile.mockResolvedValue({ ...photo, id: "file-2", fileName: "Vertrag.pdf", contentType: "application/pdf", isImage: false });
    render(<TaskAttachments basePath={basePath} />);
    await screen.findByText("No attachments yet.");

    const file = new File(["%PDF"], "Vertrag.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Add files"), file);

    expect(await screen.findByText("Vertrag.pdf")).toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalledWith(expect.objectContaining({ requestPath: `${basePath}/attachments`, file }));
  });

  it("rejects files that are too large before uploading", async () => {
    const user = userEvent.setup({ applyAccept: false });
    mockList({ attachments: [] });
    render(<TaskAttachments basePath={basePath} />);
    await screen.findByText("No attachments yet.");

    const big = new File(["x"], "Video.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 20 * 1024 * 1024 });
    await user.upload(screen.getByLabelText("Add files"), big);

    expect(await screen.findByRole("alert")).toHaveTextContent("Video.pdf is larger than 10 MB.");
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("asks for confirmation before deleting", async () => {
    const user = userEvent.setup();
    mockList();
    render(<TaskAttachments basePath={basePath} />);
    await screen.findByText("Wohnung.png");

    await user.click(screen.getByRole("button", { name: "Delete attachment Wohnung.png" }));
    expect(apiRequest).not.toHaveBeenCalledWith("/api/attachments/file-1", { method: "DELETE" });
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("Wohnung.png")).not.toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith("/api/attachments/file-1", { method: "DELETE" });
  });

  it("hides upload controls when uploads are not allowed", async () => {
    mockList({ uploadsEnabled: false, attachments: [{ ...photo, canDelete: false }] });
    render(<TaskAttachments basePath={basePath} />);

    await screen.findByText("Wohnung.png");
    expect(screen.queryByLabelText("Add files")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete attachment/ })).not.toBeInTheDocument();
  });
});
