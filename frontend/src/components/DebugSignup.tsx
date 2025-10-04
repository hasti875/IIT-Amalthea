import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const DebugSignup = () => {
  const { signUp } = useAuth();
  const [result, setResult] = useState('');

  const testSignup = async () => {
    const testData = {
      firstName: 'John',
      lastName: 'Doe', 
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      companyName: 'Test Company Inc.',
      country: 'United States',
      baseCurrency: 'USD'
    };

    console.log('Testing signup with:', testData);
    setResult('Testing...');

    const { error } = await signUp(testData);

    if (error) {
      setResult(`Error: ${error}`);
    } else {
      setResult('Success! User created.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Debug Signup Test</h2>
      <button onClick={testSignup}>Test Signup</button>
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0' }}>
        Result: {result}
      </div>
      <div style={{ marginTop: '10px', fontSize: '12px' }}>
        Check browser console for detailed logs.
      </div>
    </div>
  );
};

export default DebugSignup;