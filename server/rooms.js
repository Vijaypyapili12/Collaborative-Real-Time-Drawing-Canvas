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
      addUser(id, customUsername) {
        const color = randomColor();
        const userName = customUsername || `User_${id.slice(0, 4)}`;
        users[id] = { name: userName, color };
        return users[id];
      },
      removeUser(id) {
        delete users[id];
      },
      getUsersMap() {
        const map = {};
        for (const id in users) {
          map[id] = {
            name: users[id].name,
            color: users[id].color
          };
        }
        return map;
      },
    };
  }

  return { createRoom };
}