// SPDX-License-Identifier: MIT
import { INSTANCES, KONTAKTE } from '../data';

export function AustauschView() {
  return (
    <div className="view cols">
      <div className="panel">
        <div className="sec-title">Instanzen · {INSTANCES.filter((i) => i.status === 'AKTIV').length}/{INSTANCES.length} aktiv</div>
        <table className="tbl big">
          <tbody>
            {INSTANCES.map((i) => (
              <tr key={i.ip}>
                <td>{i.ip}</td>
                <td>{i.rolle}</td>
                <td><span className={`badge ${i.status === 'AKTIV' ? 'on' : 'wait'}`}>{i.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <div className="sec-title">Kontakte</div>
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
      </div>
    </div>
  );
}
