function randomColor() {
  const r = Math.floor(Math.random() * 200) + 30;
  const g = Math.floor(Math.random() * 200) + 30;
  const b = Math.floor(Math.random() * 200) + 30;
  return `rgb(${r},${g},${b})`;
}

export function createRoomManager(io) {
  function createRoom(name) {
    const users = {};

    return {
      name,
      addUser(id) {
        const color = randomColor();
        users[id] = { color };
        return users[id];
      },
      removeUser(id) {
        delete users[id];
      },
      getUsersMap() {
        const map = {};
        for (const id in users) map[id] = users[id].color;
        return map;
      },
    };
  }

  return { createRoom };
}
