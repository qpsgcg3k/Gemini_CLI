// src/components/Header.jsx

const Header = ({ theme, onToggleTheme }) => {
  return (
    <header className="bg-main-blue p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">
          TODOリスト (React版)
        </h1>
        <button 
          onClick={onToggleTheme}
          aria-label="テーマを切り替える" 
          className="text-2xl"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
};

export default Header;
