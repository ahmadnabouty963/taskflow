const STORAGE_KEY = "taskflow.tasks";

const defaultTasks = [
  {
    id: "task-review-interviews",
    title: "Review customer interviews",
    category: "Research",
    categoryClass: "category-research",
    dueDate: "Sep 18",
    assignee: "AM",
  },
  {
    id: "task-launch-announcement",
    title: "Prepare launch announcement",
    category: "Content",
    categoryClass: "category-content",
    dueDate: "Sep 20",
    assignee: "LK",
  },
];

const addTaskButton = document.querySelector("#add-task-button");
const todoTaskList = document.querySelector("#todo-task-list");
const todoCountElement = document.querySelector("#todo-count");

let tasks = loadTasks();

function loadTasks() {
  const storedTasks = localStorage.getItem(STORAGE_KEY);

  if (storedTasks === null) {
    return defaultTasks;
  }

  try {
    const parsedTasks = JSON.parse(storedTasks);

    if (!Array.isArray(parsedTasks)) {
      return defaultTasks;
    }

    return parsedTasks;
  } catch (error) {
    console.error("Tasks could not be loaded.", error);

    return defaultTasks;
  }
}

function saveTasks() {
  const tasksAsText = JSON.stringify(tasks);

  localStorage.setItem(STORAGE_KEY, tasksAsText);
}

function createTaskCard(task) {
  const taskCard = document.createElement("article");
  taskCard.classList.add("task-card");
  taskCard.dataset.taskId = task.id;

  const category = document.createElement("span");
  category.classList.add("task-category", task.categoryClass);
  category.textContent = task.category;

  const taskTitle = document.createElement("h4");
  taskTitle.textContent = task.title;

  const taskMeta = document.createElement("div");
  taskMeta.classList.add("task-meta");

  const dueDate = document.createElement("span");
  dueDate.textContent = task.dueDate;

  const avatar = document.createElement("span");
  avatar.classList.add("small-avatar");
  avatar.textContent = task.assignee;

  taskMeta.append(dueDate, avatar);
  taskCard.append(category, taskTitle, taskMeta);

  return taskCard;
}

function renderTasks() {
  todoTaskList.replaceChildren();

  for (const task of tasks) {
    const taskCard = createTaskCard(task);
    todoTaskList.append(taskCard);
  }

  todoCountElement.textContent = tasks.length;
}

function createNewTask(title) {
  return {
    id: `task-${Date.now()}`,
    title: title,
    category: "New task",
    categoryClass: "category-planning",
    dueDate: "Just now",
    assignee: "You",
  };
}

function handleAddTask() {
  const enteredTitle = window.prompt("What needs to be done?");

  if (enteredTitle === null) {
    return;
  }

  const cleanedTitle = enteredTitle.trim();

  if (cleanedTitle.length === 0) {
    window.alert("Please enter a task title.");
    return;
  }

  const newTask = createNewTask(cleanedTitle);

  tasks.push(newTask);

  saveTasks();
  renderTasks();
}

addTaskButton.addEventListener("click", handleAddTask);

renderTasks();
