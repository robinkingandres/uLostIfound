import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react'; 
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo.png'; // <-- Logo

export default function UserLogin() {
  const [isLogin, setIsLogin] = useState(true); 
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();
  const loginBackgroundImage = '/login-background.png';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please enter both username/email and password.');
      setLoading(false);
      return;
    }
    
    const loggedInUser = await login(username, password);

    setLoading(false);

    if (loggedInUser) {
      if (loggedInUser.role === 'Admin') {
        navigate('/admin/dashboard');
      } else if (loggedInUser.role === 'Guidance') {
        navigate('/guidance/dashboard');
      } else {
        navigate('/home');
      }
    } else {
      setError('Invalid username or password.');
    }
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-2 sm:px-4 py-8 font-sans bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBackgroundImage})` }}
    >
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]" aria-hidden="true"></div>

      {/* Form Card */}
      <div className="relative z-10 w-full max-w-[96vw] sm:max-w-md bg-white/95 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">

        {/* Header Toggle */}
        <div className="flex gap-4 mb-8 text-sm font-bold text-gray-400">
          <button 
            onClick={() => setIsLogin(true)}
            className={`${isLogin ? 'text-gray-800 border-b-2 border-gray-800' : ''} pb-1`}
          >
            LOGIN
          </button>         
        </div>

          {/* Logo Section */}
<div className="flex flex-col items-center mb-12">
  {/* Circular Logo Container */}
  <div className="relative w-40 h-40 mb-6">
    {/* Circular rotating ring */}
    <div
      className="absolute inset-0 rounded-full animate-spin-slow"
      style={{
        padding: "8px",
        background: "conic-gradient(#0059ff95, #f6a51f, #0059ff95)",
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
    ></div>

    {/* Logo Image */}
    <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center z-10">
      <img
        src={logo}
        alt="uLostiFound Logo"
        className="w-36 h-36 object-contain rounded-full"
      />
    </div>
  </div>

  {/* Text Section */}
  <div className="text-center">
    <h1 className="text-xl font-bold text-[#1e40af] leading-tight">
      uLostiFound
    </h1>
    <p className="text-sm font-semibold text-[#1e40af] mt-1">
      Lost & Found Management System
    </p>
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
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-[#00aaff] hover:underline font-medium"
            >
              Forgotten your password?
            </button>
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

