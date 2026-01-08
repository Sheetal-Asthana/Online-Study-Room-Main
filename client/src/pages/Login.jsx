import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Login.css';
import API from "../services/api";

function Login() {
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
        setSuccess("");
    };

    const validate = () => {
        if (!formData.username.trim() || !formData.password) {
            setError("All fields are required.");
            return false;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return false;
        }
        setError("");
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const { data } = await API.post("/auth/login", formData); 
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.user.username);

            setSuccess("Login successful! Redirecting...");
            setTimeout(() => {
                window.location.href = "/home";
            }, 1000);
        } catch (err) {
            setError("Something went wrong. Please try again.");
        }
    };

    return (
        <div className="login-container">
            <div className="bg-animation">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
            </div>

            <div className="login-card">
                <div className="login-header">
                    <div className="header-icon">🔐</div>
                    <h2>Welcome Back</h2>
                    <p>Sign in to your account</p>
                </div>
                
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                id="username"
                                name="username"
                                placeholder="Enter your username"
                                value={formData.username}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                            <div className="input-highlight"></div>
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <input
                                type="password"
                                id="password"
                                name="password"
                                placeholder="Enter your password (min 6 chars)"
                                value={formData.password}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                            <div className="input-highlight"></div>
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <button type="submit" className="submit-button">
                        Sign In
                    </button>
                </form>

                <div className="register-link">
                    Don't have an account? <Link to="/" className="link">Register</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;