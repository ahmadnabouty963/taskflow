const addTaskButton = document.querySelector("#add-task-button");
const todoColumn = document.querySelector("#todo-column");
const todoCountElement = document.querySelector("#todo-count");

function updateTodoCount() {
  const taskCards = todoColumn.querySelectorAll(".task-card");

  todoCountElement.textContent = taskCards.length;
}

function createTaskCard(title) {
  const taskCard = document.createElement("article");
  taskCard.classList.add("task-card");

  const category = document.createElement("span");
  category.classList.add("task-category", "category-planning");
  category.textContent = "New task";

  const taskTitle = document.createElement("h4");
  taskTitle.textContent = title;

  const taskMeta = document.createElement("div");
  taskMeta.classList.add("task-meta");

  const createdAt = document.createElement("span");
  createdAt.textContent = "Just now";

  const avatar = document.createElement("span");
  avatar.classList.add("small-avatar");
  avatar.textContent = "You";

  taskMeta.append(createdAt, avatar);
  taskCard.append(category, taskTitle, taskMeta);

  return taskCard;
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

  const newTaskCard = createTaskCard(cleanedTitle);

  todoColumn.append(newTaskCard);
  updateTodoCount();
}

addTaskButton.addEventListener("click", handleAddTask);

updateTodoCount();
