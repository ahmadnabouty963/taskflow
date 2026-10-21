import request from "supertest";
import app from "../src/app.js";
import { WORKSPACE_QUOTA_BYTES } from "../src/lib/attachments.js";
import prisma from "../src/lib/prisma.js";
import { memoryStorage } from "../src/lib/storage.js";

const owner = { name: "File Owner", email: "file-owner@example.com", password: "StrongPass123" };
const other = { name: "File Other", email: "file-other@example.com", password: "StrongPass123" };

async function deleteUsers() {
  await prisma.user.deleteMany({ where: { email: { in: [owner.email, other.email] } } });
}

async function registerAndLogin(user) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(user);
  await agent.post("/api/auth/login").send({ email: user.email, password: user.password });
  return agent;
}

const pdf = { fileName: "Plan.pdf", contentType: "application/pdf", size: 2048 };

let ownerAgent;
let otherAgent;
let workspaceId;
let projectId;
let taskId;
let filesPath;

async function addOther(role) {
  const otherUser = await prisma.user.findUnique({ where: { email: other.email } });
  await prisma.workspaceMember.create({ data: { workspaceId, userId: otherUser.id, role } });
}

// Simulates the browser's direct upload to storage.
async function storeUpload(attachmentId, { size, contentType }) {
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  memoryStorage.set(attachment.storageKey, { size, contentType });
  return attachment.storageKey;
}

async function uploadFile(agent, file = pdf) {
  const started = await agent.post(filesPath).send(file);
  const key = await storeUpload(started.body.data.attachment.id, file);
  const completed = await agent.post(`/api/attachments/${started.body.data.attachment.id}/complete`);
  return { started, completed, key };
}

beforeEach(async () => {
  await deleteUsers();
  memoryStorage.clear();
  ownerAgent = await registerAndLogin(owner);
  otherAgent = await registerAndLogin(other);
  const workspace = await ownerAgent.post("/api/workspaces").send({ name: "Family" });
  workspaceId = workspace.body.data.workspace.id;
  const project = await ownerAgent.post("/api/projects").send({ title: "Move house", workspaceId });
  projectId = project.body.data.project.id;
  const task = await ownerAgent.post(`/api/projects/${projectId}/tasks`).send({ title: "Sign contract" });
  taskId = task.body.data.task.id;
  filesPath = `/api/projects/${projectId}/tasks/${taskId}/attachments`;
});

afterEach(deleteUsers);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Task attachments API", () => {
  it("uploads a file in three steps and lists it", async () => {
    const { started, completed } = await uploadFile(ownerAgent);

    expect(started.statusCode).toBe(201);
    expect(started.body.data.upload).toMatchObject({ method: "PUT", headers: { "Content-Type": "application/pdf" } });
    expect(completed.statusCode).toBe(200);

    const list = await ownerAgent.get(filesPath);
    expect(list.body.data.uploadsEnabled).toBe(true);
    expect(list.body.data.attachments).toHaveLength(1);
    expect(list.body.data.attachments[0]).toMatchObject({
      fileName: "Plan.pdf",
      size: 2048,
      isImage: false,
      canDelete: true,
      uploadedBy: { name: owner.name },
    });
  });

  it("hides uploads that were never completed", async () => {
    await ownerAgent.post(filesPath).send(pdf);

    const list = await ownerAgent.get(filesPath);
    expect(list.body.data.attachments).toEqual([]);
  });

  it("rejects a completion when the stored file does not match", async () => {
    const started = await ownerAgent.post(filesPath).send(pdf);
    await storeUpload(started.body.data.attachment.id, { size: 999999, contentType: "application/pdf" });

    const completed = await ownerAgent.post(`/api/attachments/${started.body.data.attachment.id}/complete`);

    expect(completed.statusCode).toBe(422);
    expect(completed.body.error.code).toBe("UPLOAD_INCOMPLETE");
    expect(memoryStorage.size).toBe(0);
  });

  it("rejects dangerous file types and oversized files", async () => {
    const svg = await ownerAgent.post(filesPath).send({ fileName: "logo.svg", contentType: "image/svg+xml", size: 100 });
    const html = await ownerAgent.post(filesPath).send({ fileName: "page.html", contentType: "text/html", size: 100 });
    const huge = await ownerAgent.post(filesPath).send({ ...pdf, size: 11 * 1024 * 1024 });

    expect(svg.body.error.code).toBe("FILE_TYPE_NOT_ALLOWED");
    expect(html.body.error.code).toBe("FILE_TYPE_NOT_ALLOWED");
    expect(huge.statusCode).toBe(413);
  });

  it("cleans up file names", async () => {
    await uploadFile(ownerAgent, { ...pdf, fileName: "../../etc/<bad>\u0007name.pdf" });

    const list = await ownerAgent.get(filesPath);
    expect(list.body.data.attachments[0].fileName).toBe("badname.pdf");
  });

  it("enforces the workspace storage quota", async () => {
    await prisma.attachment.create({
      data: {
        kind: "TASK",
        status: "READY",
        fileName: "big.bin",
        contentType: "application/pdf",
        size: WORKSPACE_QUOTA_BYTES - 1000,
        storageKey: "quota-test",
        workspaceId,
        projectId,
        taskId,
      },
    });

    const response = await ownerAgent.post(filesPath).send(pdf);

    expect(response.statusCode).toBe(507);
    expect(response.body.error.code).toBe("WORKSPACE_STORAGE_FULL");
  });

  it("keeps files private to the workspace", async () => {
    await uploadFile(ownerAgent);

    const list = await otherAgent.get(filesPath);
    const upload = await otherAgent.post(filesPath).send(pdf);

    expect(list.statusCode).toBe(404);
    expect(upload.statusCode).toBe(404);
  });

  it("lets viewers see files but not upload or delete them", async () => {
    await addOther("VIEWER");
    await uploadFile(ownerAgent);

    const list = await otherAgent.get(filesPath);
    const upload = await otherAgent.post(filesPath).send(pdf);
    const removal = await otherAgent.delete(`/api/attachments/${list.body.data.attachments[0].id}`);

    expect(list.body.data.attachments).toHaveLength(1);
    expect(list.body.data.uploadsEnabled).toBe(false);
    expect(list.body.data.attachments[0].canDelete).toBe(false);
    expect(upload.statusCode).toBe(403);
    expect(removal.statusCode).toBe(403);
  });

  it("lets members delete only their own files and admins delete all", async () => {
    await addOther("MEMBER");
    const { completed } = await uploadFile(ownerAgent);
    const attachmentId = completed.body.data.attachment.id;

    const byMember = await otherAgent.delete(`/api/attachments/${attachmentId}`);
    expect(byMember.statusCode).toBe(403);

    await prisma.workspaceMember.updateMany({ where: { workspaceId, role: "MEMBER" }, data: { role: "ADMIN" } });
    const byAdmin = await otherAgent.delete(`/api/attachments/${attachmentId}`);
    expect(byAdmin.statusCode).toBe(204);
    expect(memoryStorage.size).toBe(0);
  });

  it("only lets the uploader complete an upload", async () => {
    await addOther("MEMBER");
    const started = await ownerAgent.post(filesPath).send(pdf);
    await storeUpload(started.body.data.attachment.id, pdf);

    const completed = await otherAgent.post(`/api/attachments/${started.body.data.attachment.id}/complete`);
    expect(completed.statusCode).toBe(404);
  });

  it("removes stored files when the task, project or account is deleted", async () => {
    const first = await uploadFile(ownerAgent);
    await ownerAgent.delete(`/api/projects/${projectId}/tasks/${taskId}`);
    expect(memoryStorage.has(first.key)).toBe(false);

    const task = await ownerAgent.post(`/api/projects/${projectId}/tasks`).send({ title: "Second" });
    filesPath = `/api/projects/${projectId}/tasks/${task.body.data.task.id}/attachments`;
    const second = await uploadFile(ownerAgent);
    await ownerAgent.delete(`/api/projects/${projectId}`);
    expect(memoryStorage.has(second.key)).toBe(false);

    const project = await ownerAgent.post("/api/projects").send({ title: "Third", workspaceId });
    const thirdTask = await ownerAgent.post(`/api/projects/${project.body.data.project.id}/tasks`).send({ title: "Third" });
    filesPath = `/api/projects/${project.body.data.project.id}/tasks/${thirdTask.body.data.task.id}/attachments`;
    const third = await uploadFile(ownerAgent);
    await ownerAgent.delete("/api/auth/me").send({ password: owner.password });
    expect(memoryStorage.has(third.key)).toBe(false);
  });
});

describe("Whiteboard images API", () => {
  it("stores whiteboard images and returns them with the whiteboard", async () => {
    const image = { fileName: "sketch.png", contentType: "image/png", size: 4096, fileId: "excalidraw-file-1" };
    const started = await ownerAgent.post(`/api/projects/${projectId}/whiteboard/files`).send(image);
    await storeUpload(started.body.data.attachment.id, image);
    await ownerAgent.post(`/api/attachments/${started.body.data.attachment.id}/complete`);

    const whiteboard = await ownerAgent.get(`/api/projects/${projectId}/whiteboard`);

    expect(started.statusCode).toBe(201);
    expect(whiteboard.body.data.uploadsEnabled).toBe(true);
    expect(whiteboard.body.data.files).toEqual([
      expect.objectContaining({ fileId: "excalidraw-file-1", mimeType: "image/png" }),
    ]);
  });

  it("accepts only images up to 5 MB", async () => {
    const path = `/api/projects/${projectId}/whiteboard/files`;
    const pdfFile = await ownerAgent.post(path).send({ ...pdf, fileId: "a" });
    const huge = await ownerAgent.post(path).send({ fileName: "x.png", contentType: "image/png", size: 6 * 1024 * 1024, fileId: "b" });

    expect(pdfFile.body.error.code).toBe("FILE_TYPE_NOT_ALLOWED");
    expect(huge.statusCode).toBe(413);
  });
});

describe("Rate limiting behind a proxy", () => {
  function remaining(response) {
    return Number(/r=(\d+)/.exec(response.headers.ratelimit)?.[1]);
  }

  it("counts requests per visitor IP", async () => {
    const first = await request(app).get("/api/projects").set("X-Forwarded-For", "203.0.113.10");
    const second = await request(app).get("/api/projects").set("X-Forwarded-For", "203.0.113.10");
    const otherVisitor = await request(app).get("/api/projects").set("X-Forwarded-For", "198.51.100.20");

    expect(remaining(second)).toBe(remaining(first) - 1);
    expect(remaining(otherVisitor)).toBe(remaining(first));
  });
});
