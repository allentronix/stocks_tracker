import TopTen from "./components/TopTen";
import SearchBar from "./components/SearchBar";

function App() {
  return (
    <div className="min-h-screen bg-red-100 text-gray-900 p-6">
      <h1 className="text-3xl font-bold mb-4">Stock Tracker</h1>
      <SearchBar />
      <TopTen />
    </div>
  );
}

export default App;
