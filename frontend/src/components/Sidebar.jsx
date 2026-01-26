import React, { useState } from "react";

/*
 Props:
  labels: [{id,name,color}]
  annotations: [{label,text,id}]
  onAddLabel: fn({id,name,color})
  onScrollToAnnotation: fn(id)
*/
export default function Sidebar({ labels = [], annotations = [], onAddLabel, onScrollToAnnotation }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ffd54f");

  function handleAdd() {
    const n = name.trim();
    if (!n) return;
    const id = n.toLowerCase().replace(/\s+/g, "_") + "_" + Math.random().toString(36).slice(2, 5);
    onAddLabel && onAddLabel({ id, name: n, color });
    setName("");
  }

  // group annotations by label name
  const grouped = labels.reduce((acc, l) => {
    acc[l.name] = annotations.filter(a => a.label === l.name);
    return acc;
  }, {});

  return (
    <aside className="sidebar" aria-label="Labels and annotations">
      <h3 style={{ margin: 0 }}>Labels</h3>

      <div className="labels-list" style={{ marginTop: 8 }}>
        {labels.length === 0 && <div className="empty-note">No labels yet — create one below to start annotating.</div>}
        {labels.map(l => (
          <div key={l.id} className="label-row" title={l.name}>
            <div className="left">
              <div className="swatch" style={{ background: l.color }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="label-name">{l.name}</div>
                <div className="label-count">{(grouped[l.name] || []).length} highlights</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}></div>
          </div>
        ))}
      </div>

      <div style={{ height: 8 }}></div>

      <div style={{ fontSize: 13, color: '#475569' }}>Add new label</div>
      <div className="add-label" style={{ marginTop: 6 }}>
        <input aria-label="Label name" type="text" placeholder="Label name" value={name} onChange={e => setName(e.target.value)} />
        <input aria-label="Choose color" type="color" value={color} onChange={e => setColor(e.target.value)} />
        <button className="btn btn-primary" onClick={handleAdd}>Add</button>
      </div>

      <div className="label-group" style={{ marginTop: 12 }}>
        {labels.map(l => (
          <div key={`group-${l.id}`} style={{ marginBottom: 10 }}>
            <h4><span style={{ width: 12, height: 12, background: l.color, display: 'inline-block', borderRadius: 4 }} /> {l.name}</h4>
            <ul>
              {(grouped[l.name] || []).slice(0, 20).map(a => (
                <li key={a.id}>
                  <button className="link-like" onClick={() => onScrollToAnnotation && onScrollToAnnotation(a.id)}>{a.text.length > 80 ? a.text.slice(0, 77) + '...' : a.text}</button>
                </li>
              ))}
              {(grouped[l.name] || []).length === 0 && <li className="muted">— none —</li>}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
