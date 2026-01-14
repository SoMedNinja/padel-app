export default function FilterBar({ filter,setFilter }) {
  return (
    <div className="filter-bar">
      <button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>Alla matcher</button>
      <button className={filter==="short"?"active":""} onClick={()=>setFilter("short")}>Korta matcher</button>
      <button className={filter==="long"?"active":""} onClick={()=>setFilter("long")}>Långa matcher</button>
    </div>
  );
}
