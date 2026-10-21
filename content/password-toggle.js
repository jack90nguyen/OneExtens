(() => {
  "use strict";

  const revealed = [];

  function hide() {
    for (const field of revealed) {
      if (field.isConnected) {
        field.type = "password";
      }
    }

    const count = revealed.length;
    revealed.length = 0;
    return { revealed: false, count };
  }

  function show() {
    const fields = document.querySelectorAll("input[type=password]");
    for (const field of fields) {
      field.type = "text";
      revealed.push(field);
    }

    return { revealed: revealed.length > 0, count: revealed.length };
  }

  function toggle() {
    if (revealed.length > 0) {
      return hide();
    }
    return show();
  }

  window.__autofillPassword = {
    toggle
  };
})();
