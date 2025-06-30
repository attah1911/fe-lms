import instance from "../libs/axios/instance";

export interface Todo {
  _id?: string;
  title: string;
  description?: string;
  dueDate?: string | Date;
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface TodosResponse {
  data: Todo[];
  pagination: {
    total: number;
    totalPages: number;
    current: number;
  };
}

interface TodoParams {
  page?: number;
  limit?: number;
  completed?: boolean;
}

const todoService = {
  /**
   * Get all todos
   */
  getTodos: async (params: TodoParams = {}): Promise<TodosResponse> => {
    try {
      const { page = 1, limit = 10, completed } = params;
      let url = `/todos?page=${page}&limit=${limit}`;
      
      if (completed !== undefined) {
        url += `&completed=${completed}`;
      }
      
      const response = await instance.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch todos");
    }
  },

  /**
   * Get todo by id
   */
  getTodoById: async (id: string): Promise<Todo> => {
    try {
      const response = await instance.get(`/todos/${id}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch todo");
    }
  },

  /**
   * Create new todo
   */
  createTodo: async (todo: Omit<Todo, "_id" | "createdAt" | "updatedAt">): Promise<Todo> => {
    try {
      const response = await instance.post("/todos", todo);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to create todo");
    }
  },

  /**
   * Update todo
   */
  updateTodo: async (id: string, todo: Partial<Omit<Todo, "_id" | "createdAt" | "updatedAt">>): Promise<Todo> => {
    try {
      const response = await instance.put(`/todos/${id}`, todo);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to update todo");
    }
  },

  /**
   * Delete todo
   */
  deleteTodo: async (id: string): Promise<void> => {
    try {
      await instance.delete(`/todos/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to delete todo");
    }
  },

  /**
   * Toggle todo completed status
   */
  toggleTodoStatus: async (id: string): Promise<Todo> => {
    try {
      const response = await instance.patch(`/todos/${id}/toggle`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to toggle todo status");
    }
  }
};

export default todoService; 
