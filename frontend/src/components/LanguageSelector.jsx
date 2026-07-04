function LanguageSelector({ language, onChange }) {
  return (
    <label className="language-select">
      <span className="sr-only">Select language</span>
      <select value={language} onChange={onChange}>
        <option value="English">English</option>
        <option value="Tamil">Tamil</option>
        <option value="Malayalam">Malayalam</option>
      </select>
    </label>
  );
}

export default LanguageSelector;
