const API_URL = 'http://127.0.0.1:8000/api';

export const fetchUsers = async () => {
  const response = await fetch(`${API_URL}/users/`);
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
};

// delete user
export const deleteUser = async (id: number) => {
  const response = await fetch(`${API_URL}/users/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete user');
  }
};

// update user
export const updateUser = async (id: number, data: any) => {
  const response = await fetch(`${API_URL}/users/${id}/`, {
    method: 'PATCH', // Use PATCH for partial updates
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }
  
  return response.json();
};