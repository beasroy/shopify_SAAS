import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast"
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext'; 

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast()
  const navigate = useNavigate();
  const [errors, setErrors] = useState({ username: '', email: '', password: '' });
  const { setUser } = useUser(); 

  const toggleForm = () => setIsLogin(!isLogin);

  const validateForm = () => {
    const newErrors = { username: '', email: '', password: '' };
    let isValid = true;

    if (!isLogin && !username.trim()) {
      newErrors.username = 'Username is required';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
        let response;
        if (isLogin) {
            response = await axios.post(
                'http://3.109.203.156:8000/auth/login', 
                { email, password },
                { withCredentials: true }
            );

            if (response.data.success) {
                // Set the user in the context
                setUser(response.data.user);
                console.log('User set in context:', response.data.user);

                toast({
                    title: 'Login successful!',
                    description: 'Welcome! Redirecting to your dashboard.',
                    variant: 'default',
                });
                navigate('/dashboard');
            }
        } else {
            response = await axios.post(
                'http://3.109.203.156:8000/auth/signup', 
                { username, email, password },
                { withCredentials: true }
            );

            if (response.data.success) {
                toast({
                    title: 'Registration successful!',
                    description: 'Please log in with your new account.',
                    variant: 'default',
                });
                setIsLogin(true);
            }
        }
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            toast({
                title: 'Error',
                description: error.response.data.message || 'An error occurred',
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Unexpected Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 to-indigo-600">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-lg shadow-2xl w-96"
      >
        <div className="flex mb-6">
          <button
            className={`flex-1 py-2 ${isLogin ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 ${!isLogin ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field for Registration */}
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: !isLogin ? 1 : 0, height: !isLogin ? 'auto' : 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden space-y-2"
            >
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required={!isLogin}
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </motion.div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

         
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            {isLogin ? 'Login' : 'Sign Up'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={toggleForm} className="text-indigo-600 hover:underline">
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
