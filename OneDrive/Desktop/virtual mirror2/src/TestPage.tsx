const TestPage = () => {
  console.log('TestPage rendering');
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue', minHeight: '100vh' }}>
      <h1 style={{ color: 'black' }}>Test Page</h1>
      <p style={{ color: 'black' }}>If you can see this, React is working!</p>
    </div>
  );
};

export default TestPage;
