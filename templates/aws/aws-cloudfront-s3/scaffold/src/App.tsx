function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{{service_name}}</h1>
        <p className="text-lg text-gray-600">Static site deployed on AWS CloudFront + S3.</p>
      </div>
    </div>
  );
}

export default App;
