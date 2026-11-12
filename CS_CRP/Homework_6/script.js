// Small interactions for the Creative Desk.
document.querySelectorAll(".object").forEach((object) => {
  object.addEventListener("click", () => {
    object.classList.add("clicked");
  });
});

// A tiny welcome message in the browser console.
console.log("Welcome to the Creative Desk!");
