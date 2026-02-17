import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { requestPasswordReset, verifyPasswordResetCode, confirmPasswordReset } from '../../services/authApi';
import emailIcon from '../../assets/email.png'; // Email Icon
import keyIcon from '../../assets/key.png'; // Key Icon
import lockIcon from '../../assets/lock.png'; // Lock Icon


export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: Code, 3: New Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1: Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email);
      setStep(2);
      setSuccessMsg('Verification code sent! Check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code against backend before moving to Step 3
  const handleVerifyCodeStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
        setError('Code must be 6 digits.');
        return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await verifyPasswordResetCode(email, code);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Confirm Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPass) {
        setError('Passwords do not match.');
        return;
    }
    if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
    }

    setLoading(true);
    setError('');
    try {
      await confirmPasswordReset(email, code, password);
      alert('Password reset successful! Redirecting to login...');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8">
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
            <button onClick={() => navigate('/login')} className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">Reset Password</h2>
        </div>

        {/* Status Messages */}
        {error && (
            <div className="mb-4 bg-red-100 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
                {error}
            </div>
        )}
        {successMsg && (
            <div className="mb-4 bg-green-100 border border-green-200 text-green-600 text-sm p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> {successMsg}
            </div>
        )}

        {/* STEP 1: Email Input */}
        {step === 1 && (
        <form onSubmit={handleRequestCode} className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">

        {/* Custom Email Icon inside Blue Circle */}
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <img 
            src={emailIcon} 
            alt="Email Icon" 
            className="w-20 h-20 object-contain"    // Size of Email Icon
        />
        </div>
      
      <p className="text-gray-500 text-sm leading-relaxed px-4">
        Enter your email address to receive a <span className="font-semibold text-[#1e40af]">6-digit verification code</span>.
      </p>
    </div>

    <div className="space-y-2 text-left">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
        Email Address
      </label>
      <input 
        type="email" 
        required
        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:bg-white focus:outline-none transition-all placeholder:text-gray-300 text-gray-700"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="e.g. student@school.edu.ph"
      />
    </div>

    <button 
      type="submit" 
      disabled={loading}
      className="w-full bg-[#1e40af] hover:bg-[#1d3557] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
    >
      {loading ? 'Sending...' : 'Send Code'}
    </button>
  </form>
)}

        {/* STEP 2: Code Input */}
        {step === 2 && (
            <form onSubmit={handleVerifyCodeStep} className="space-y-5 animate-fade-in">
                <div className="text-center mb-4">
                    {/* Custom Key Image inside a Circle Container */}
                <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <img 
                        src={keyIcon} 
                        alt="Key Icon" 
                        className="w-full h-full object-contain" // Size of Key Icon
                    />
                </div>
                    <p className="text-gray-600 text-sm">Enter the 6-digit code sent to <span className="font-semibold text-gray-800">{email}</span></p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Verification Code</label>
                    <input 
                        type="text" 
                        required
                        maxLength={6}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:outline-none transition-all text-center text-2xl tracking-widest font-mono"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="000000"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-200"
                >
                    {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                <div className="text-center">
                    <button type="button" onClick={() => setStep(1)} className="text-xs text-gray-500 hover:underline">Wrong email?</button>
                </div>
            </form>
        )}

        {/* STEP 3: New Password */}
        {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5 animate-fade-in">
                <div className="text-center mb-4">
                    {/* Custom Lock Icon inside Green Circle */}
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <img 
                        src={lockIcon} 
                        alt="Lock Icon" 
                        className="w-full h-full object-contain" 
                    />
                </div>
                    <p className="text-gray-600 text-sm">Create a new password.</p>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">New Password</label>
                    <input 
                        type="password" 
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:outline-none transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirm Password</label>
                    <input 
                        type="password" 
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:outline-none transition-all"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-green-200"
                >
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>
        )}

      </div>
    </div>
  );
}
