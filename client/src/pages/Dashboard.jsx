import React from 'react';

const Dashboard = () => {
    return (
        <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
            <h1>Welcome to the Online Study Room</h1>
            <p>
                This is your dashboard. Here you can access your study rooms, view your schedule, and manage your account.
            </p>
            <div style={{ marginTop: '2rem' }}>
                <button style={{ marginRight: '1rem' }}>Join Study Room</button>
                <button style={{ marginRight: '1rem' }}>View Schedule</button>
                <button>Account Settings</button>
            </div>
        </div>
    );
};

export default Dashboard;