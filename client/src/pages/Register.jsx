import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Register.css';
import API from "../services/api";

function Register() {
    const [formData, setFormData] = useState({ username: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
        setSuccess("");
    };

    const validate = () => {
        if (!formData.username.trim() || !formData.email.trim() || !formData.password) {
            setError("All fields are required.");
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError("Please enter a valid email address.");
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
            const { data } = await API.post("/auth/register", formData); 

            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.user.username);

            setSuccess("Registration successful! Redirecting...");
            setTimeout(() => {
                window.location.href = "/login";
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.msg || "Something went wrong. Please try again.");
        }
    };

    return (
        <div className="register-container">
            <div className="bg-animation">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
            </div>

            <div className="register-card">
                <div className="register-header">
                    <h2>Create Account</h2>
                    <p>Join us today</p>
                </div>
                
                <form onSubmit={handleSubmit} className="register-form">
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
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="Enter your email"
                                value={formData.email}
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
                        Create Account
                    </button>
                </form>

                <div className="login-link">
                    Already have an account? <Link to="/login" className="link">Sign In</Link>
                </div>
            </div>
        </div>
    );
}

export default Register;