import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Hand, Search } from 'lucide-react'; 
import { useAuth } from '../../contexts/AuthContext';

export default function UserLogin() {
  const [isLogin, setIsLogin] = useState(true); 
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please enter both username/email and password.');
      setLoading(false);
      return;
    }
    
    // CHANGED: We now get the user object back
    const loggedInUser = await login(username, password);

    setLoading(false);

    if (loggedInUser) {
      // --- RBAC REDIRECTION LOGIC ---
      if (loggedInUser.role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    } else {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-600 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
        
        {/* Header Toggle */}
        <div className="flex gap-4 mb-8 text-sm font-bold text-gray-400">
          <button 
            onClick={() => setIsLogin(true)}
            className={`${isLogin ? 'text-gray-800 border-b-2 border-gray-800' : ''} pb-1`}
          >
            LOGIN
          </button>
          <span>/</span>
          <button 
            onClick={() => setIsLogin(false)}
            className={`${!isLogin ? 'text-gray-800 border-b-2 border-gray-800' : ''} pb-1`}
          >
            SIGNUP (WIP)
          </button>
        </div>

        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-40 h-40 mb-2">
            <div className="flex w-full h-full rounded-full overflow-hidden border-4 border-gray-100 shadow-inner">
              <div className="w-1/2 h-full bg-[#29b6f6] flex items-center justify-center relative">
                 <Hand className="text-white w-12 h-12 absolute top-8 left-4 rotate-[-15deg]" strokeWidth={2.5} />
                 <div className="absolute bottom-8 right-2 w-8 h-6 border-2 border-white rounded-sm"></div>
              </div>
              <div className="w-1/2 h-full bg-[#ff9800] flex items-center justify-center relative">
                 <div className="absolute top-10 right-6">
                    <div className="border-2 border-black rounded-full p-1">
                        <div className="w-6 h-10 border-2 border-black rounded-md"></div>
                    </div>
                 </div>
                 <Search className="text-black w-10 h-10 absolute bottom-10 left-[-10px] z-10" strokeWidth={3} />
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-full text-center">
              <span className="text-2xl font-black text-[#1e293b] tracking-tighter">
                uLost<span className="text-[#1e293b]">iFound</span>
              </span>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username / Email / ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#00aaff] focus:ring-1 focus:ring-[#00aaff] transition-colors"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#00aaff] focus:ring-1 focus:ring-[#00aaff] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <a href="#" className="text-[#00aaff] hover:underline font-medium">
              Forgotten your password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0091ea] hover:bg-[#0081d5] text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-200 flex items-center justify-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}