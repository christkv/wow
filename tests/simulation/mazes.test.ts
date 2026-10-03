import { describe, expect, it } from "vitest";
import { TILE_SIZE, type MazeDefinition, type Vector } from "../../src/game/model";
import { MAZES, mazeForDungeon } from "../../src/game/mazes";

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function cell(position: Vector): [number, number] {
  return [Math.floor(position.x / TILE_SIZE), Math.floor(position.y / TILE_SIZE)];
}

function reachable(maze: MazeDefinition, start: Vector): Set<string> {
  const [startX, startY] = cell(start);
  const visited = new Set([key(startX, startY)]);
  const queue: Array<[number, number]> = [[startX, startY]];
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= maze.width || ny >= maze.height || maze.walls[ny]?.[nx]) continue;
      const id = key(nx, ny);
      if (!visited.has(id)) {
        visited.add(id);
        queue.push([nx, ny]);
      }
    }
  }
  return visited;
}

describe("authored maze content", () => {
  for (const maze of Object.values(MAZES)) {
    it(`${maze.id} keeps players, enemies, and gates in one connected floor`, () => {
      expect(maze.walls).toHaveLength(maze.height);
      expect(maze.walls.every((row) => row.length === maze.width)).toBe(true);
      const floor = reachable(maze, maze.playerSpawns.gold);
      const required = [maze.playerSpawns.cyan, ...maze.enemySpawns];
      for (const position of required) {
        const [x, y] = cell(position);
        expect(maze.walls[y]?.[x]).toBe(false);
        expect(floor.has(key(x, y))).toBe(true);
      }
      expect(floor.has(key(0, maze.gateRow))).toBe(true);
      expect(floor.has(key(maze.width - 1, maze.gateRow))).toBe(true);
    });
  }

  it("schedules the authored Arena and repeating Pit milestones", () => {
    expect(mazeForDungeon(4).id).toBe("arena-01");
    expect(mazeForDungeon(13).id).toBe("pit-01");
    expect(mazeForDungeon(19).id).toBe("pit-01");
    expect(mazeForDungeon(12).id).toBe("lattice-01");
  });
});
