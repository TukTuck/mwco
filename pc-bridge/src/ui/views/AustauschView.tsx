// SPDX-License-Identifier: MIT
import { KONTAKTE } from '../data';
import { bridge } from '../bridge';
import { useBridge } from '../useBridge';

export function AustauschView() {
  const inst = useBridge(() => bridge.workers(), []);
  return (
    <div className="view cols">
      <div className="panel">
        <div className="sec-title">Instanzen · {inst.filter((i) => i.status === 'AKTIV').length}/{inst.length} aktiv</div>
        {inst.length === 0 ? (
          <div className="dim" style={{ padding: 12 }}>Keine Instanzen — Hub nicht verbunden</div>
        ) : (
          <table className="tbl big">
            <tbody>
              {inst.map((i) => (
                <tr key={i.ip}>
                  <td>{i.ip}</td>
                  <td>{i.rolle}</td>
                  <td><span className={`badge ${i.status === 'AKTIV' ? 'on' : 'wait'}`}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="panel">
        <div className="sec-title">Kontakte</div>
        {KONTAKTE.length === 0 ? (
          <div className="dim" style={{ padding: 12 }}>Keine Kontakte — noch keine Worker verbunden</div>
        ) : (
          <table className="tbl big">
            <tbody>
              {KONTAKTE.map((k) => (
                <tr key={k.name}>
                  <td>{k.name}</td>
                  <td className="dim">{k.addr}</td>
                  <td><span className={`badge ${k.status === 'AKTIV' ? 'on' : 'wait'}`}>{k.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
