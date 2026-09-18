import api from '@/lib/api';

export interface BoardColumn {
  id: number;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  boardId: number;
  _count: {
    tasks: number;
  };
}

export interface Board {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  projectId: number;
  ownerId: number;
  columns: BoardColumn[];
}

export async function getBoards(): Promise<Board[]> {
  const response = await api.get<Board[]>('/boards');

  return response.data;
}

export async function getProjectBoards(projectId: number): Promise<Board[]> {
  const boards = await getBoards();

  return boards.filter((board) => board.projectId === projectId);
}

export interface CreateBoardData {
  name: string;
  projectId: number;
}

export async function createBoard(data: CreateBoardData): Promise<Board> {
  const response = await api.post<Board>('/boards', data);

  return response.data;
}

export async function getBoard(boardId: number): Promise<Board> {
  const response = await api.get<Board>(`/boards/${boardId}`);

  return response.data;
}

export interface CreateColumnData {
  name: string;
}

export interface UpdateColumnData {
  name?: string;
}

export async function createColumn(
  boardId: number,
  data: CreateColumnData,
): Promise<BoardColumn> {
  const response = await api.post<BoardColumn>(
    `/boards/${boardId}/columns`,
    data,
  );

  return response.data;
}

export async function updateColumn(
  boardId: number,
  columnId: number,
  data: UpdateColumnData,
): Promise<BoardColumn> {
  const response = await api.patch<BoardColumn>(
    `/boards/${boardId}/columns/${columnId}`,
    data,
  );

  return response.data;
}

export async function deleteColumn(
  boardId: number,
  columnId: number,
): Promise<void> {
  await api.delete(`/boards/${boardId}/columns/${columnId}`);
}

export interface MoveColumnData {
  position: number;
}

export async function moveColumn(
  boardId: number,
  columnId: number,
  data: MoveColumnData,
): Promise<BoardColumn> {
  const response = await api.patch<BoardColumn>(
    `/boards/${boardId}/columns/${columnId}/move`,
    data,
  );

  return response.data;
}
