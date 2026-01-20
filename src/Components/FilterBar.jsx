export default function FilterBar({ filter,setFilter }) {
  return (
    <div className="filter-bar">
      <button
        type="button"
        className={filter==="all"?"active":""}
        aria-pressed={filter==="all"}
        onClick={()=>setFilter("all")}
      >
        Alla matcher
      </button>
      <button
        type="button"
        className={filter==="short"?"active":""}
        aria-pressed={filter==="short"}
        onClick={()=>setFilter("short")}
      >
        Korta matcher
      </button>
      <button
        type="button"
        className={filter==="long"?"active":""}
        aria-pressed={filter==="long"}
        onClick={()=>setFilter("long")}
      >
        Långa matcher
      </button>
    </div>
  );
}
