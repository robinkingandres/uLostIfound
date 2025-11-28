import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Hand } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  // New async structure:
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    // Call the async login function
    const success = await login(username, password);

    if (success) {
      navigate('/admin/dashboard');
    } else {
      // The error should ideally be caught and set by the AuthContext login function
      setError('Invalid credentials');
    }
};

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-40 h-40 bg-white rounded-full shadow-lg mb-4">
            <div className="flex">
              <div className="w-20 h-20 bg-cyan-400 rounded-l-full flex items-center justify-center">
                <Hand className="w-10 h-10 text-white" />
              </div>
              <div className="w-20 h-20 bg-orange-400 rounded-r-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white rounded-full relative">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">uLostiFound</h1>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-xl font-semibold text-center mb-6 text-gray-800">Login to Dashboard</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <div className="text-right">
              <a href="#" className="text-sm text-gray-600 hover:text-cyan-500">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full bg-white border-2 border-cyan-400 text-cyan-500 py-3 rounded-md font-semibold hover:bg-cyan-400 hover:text-white transition-colors duration-200"
            >
              LOGIN
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
