import { BAND_TYPES, DEFAULT_BAND_TYPE, LANGS, bandName, parseBandLabel, uid, type Band, type BandType, type Lang, type Material, type Settings } from "../model";
import { fmtNum, type Texts } from "../i18n";
import { pickFile } from "../hooks";
import { COLS } from "./CutSheet";
import { NumInput } from "./NumInput";

interface Props {
  settings: Settings;
  t: Texts;
  onSettings: (patch: Partial<Settings>) => void;
}

/** Shrinks the logo so it stays small inside the saved settings. */
async function readLogo(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 240 / img.height, 600 / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SettingsView({ settings: s, t, onSettings }: Props) {
  const company = (patch: Partial<Settings["company"]>) => onSettings({ company: { ...s.company, ...patch } });
  const mat = (id: string, patch: Partial<Material>) => onSettings({ materials: s.materials.map(m => (m.id === id ? { ...m, ...patch } : m)) });
  const band = (id: string, patch: Partial<Band>) => onSettings({ bands: s.bands.map(b => (b.id === id ? { ...b, ...patch } : b)) });

  const addMaterial = () => {
    const last = s.materials[s.materials.length - 1];
    onSettings({
      materials: [...s.materials, { id: uid(), name: "", thickness: 18, sheetL: last?.sheetL || 2800, sheetW: last?.sheetW || 2070, grain: true, bandId: "" }],
    });
  };
  const addBand = () => onSettings({ bands: [...s.bands, { id: uid(), type: DEFAULT_BAND_TYPE, label: "", width: 22, thickness: 1 }] });

  return (
    <div class="settings">
      <header class="topbar">
        <div>
          <a class="back" href="#">← {t.back}</a>
          <h1 class="brand">{t.s_title}</h1>
        </div>
        <select id="setLang" aria-label={t.o_lang} value={s.lang} onChange={e => onSettings({ lang: e.currentTarget.value as Lang })}>
          {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </header>

      <section class="box">
        <h2>{t.h_company}</h2>
        <p class="hint">{t.company_hint}</p>
        <div class="grid2">
          <label class="field"><span>{t.w_name}</span>
            <input id="coName" type="text" value={s.company.name} onInput={e => company({ name: e.currentTarget.value })} />
          </label>
          <label class="field"><span>{t.w_phone}</span>
            <input id="coPhone" type="text" value={s.company.phone} onInput={e => company({ phone: e.currentTarget.value })} />
          </label>
          <label class="field"><span>{t.w_address}</span>
            <input id="coAddress" type="text" value={s.company.address} onInput={e => company({ address: e.currentTarget.value })} />
          </label>
          <div class="field">
            <span>{t.w_logo}</span>
            <div class="row">
              {s.company.logo && <img class="logo-prev" src={s.company.logo} alt="" />}
              <button class="btn" type="button" onClick={async () => { const f = await pickFile("image/*"); if (f) company({ logo: await readLogo(f) }); }}>{t.logo_pick}</button>
              {s.company.logo && <button class="btn ghost" type="button" onClick={() => company({ logo: "" })}>{t.logo_remove}</button>}
            </div>
          </div>
        </div>
      </section>

      <section class="box">
        <h2>{t.h_materials}</h2>
        <p class="hint">{t.materials_hint}</p>
        <div class="tbl-scroll">
          <table class="ed set-tbl">
            <thead>
              <tr><th>{t.m_name}</th><th>{t.m_thick}</th><th>{t.m_sheet}</th><th>{t.m_grain}</th><th>{t.m_band}</th><th></th></tr>
            </thead>
            <tbody>
              {s.materials.map(m => (
                <tr key={m.id}>
                  <td><input id={`mn-${m.id}`} type="text" class="ed-mat" value={m.name} onInput={e => mat(m.id, { name: e.currentTarget.value })} /></td>
                  <td><NumInput id={`mt-${m.id}`} value={m.thickness} onValue={v => mat(m.id, { thickness: v })} class="narrow" /></td>
                  <td class="nowrap">
                    <NumInput id={`ml-${m.id}`} value={m.sheetL} int onValue={v => mat(m.id, { sheetL: v })} />
                    {" × "}
                    <NumInput id={`mw-${m.id}`} value={m.sheetW} int onValue={v => mat(m.id, { sheetW: v })} />
                  </td>
                  <td class="center"><input id={`mg-${m.id}`} type="checkbox" checked={m.grain} aria-label={t.m_grain} onChange={e => mat(m.id, { grain: e.currentTarget.checked })} /></td>
                  <td>
                    <select id={`mb-${m.id}`} value={m.bandId} aria-label={t.m_band} onChange={e => mat(m.id, { bandId: e.currentTarget.value })}>
                      <option value="">{t.no_band}</option>
                      {s.bands.map(b => <option key={b.id} value={b.id}>{bandName(b, s.bands)}</option>)}
                    </select>
                  </td>
                  <td><button type="button" class="icon" title={t.remove} aria-label={t.remove} onClick={() => onSettings({ materials: s.materials.filter(x => x.id !== m.id) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div><button class="btn" type="button" onClick={addMaterial}>+ {t.add_material}</button></div>
      </section>

      <section class="box">
        <h2>{t.h_bands}</h2>
        <div class="tbl-scroll">
          <table class="ed set-tbl">
            <thead><tr><th>{t.b_type}</th><th>{t.b_label}</th><th>{t.b_width}</th><th>{t.b_thick}</th><th></th></tr></thead>
            <tbody>
              {s.bands.map(b => (
                <tr key={b.id}>
                  <td>
                    <select id={`bty-${b.id}`} class="band-type" value={b.type} aria-label={t.b_type} onChange={e => band(b.id, { type: e.currentTarget.value as BandType })}>
                      {BAND_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </td>
                  <td>
                    <input id={`bl-${b.id}`} type="text" value={b.label} placeholder={`${fmtNum(b.width)} × ${fmtNum(b.thickness)} mm`}
                      onInput={e => {
                        const label = e.currentTarget.value;
                        const parsed = parseBandLabel(label);
                        band(b.id, parsed.width ? { label, ...parsed } : { label });
                      }} />
                  </td>
                  <td><NumInput id={`bw-${b.id}`} value={b.width} onValue={v => band(b.id, { width: v })} class="narrow" /></td>
                  <td><NumInput id={`bt-${b.id}`} value={b.thickness} onValue={v => band(b.id, { thickness: v })} class="narrow" /></td>
                  <td>
                    <button type="button" class="icon" title={t.remove} aria-label={t.remove}
                      onClick={() => onSettings({
                        bands: s.bands.filter(x => x.id !== b.id),
                        materials: s.materials.map(m => (m.bandId === b.id ? { ...m, bandId: "" } : m)),
                      })}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div><button class="btn" type="button" onClick={addBand}>+ {t.add_band}</button></div>
      </section>

      <section class="box">
        <h2>{t.h_cutting}</h2>
        <div class="grid3">
          <label class="field"><span>{t.kerf}</span><NumInput id="kerf" value={s.kerf} zero onValue={v => onSettings({ kerf: v })} /></label>
          <label class="field"><span>{t.trim}</span><NumInput id="trim" value={s.trim} zero onValue={v => onSettings({ trim: v })} /></label>
          <label class="field"><span>{t.min_offcut}</span><NumInput id="minOff" value={s.minOffcut} zero onValue={v => onSettings({ minOffcut: v })} /></label>
        </div>
        <label class="check"><input id="deduct" type="checkbox" checked={s.deductBand} onChange={e => onSettings({ deductBand: e.currentTarget.checked })} /> {t.deduct}</label>
        <p class="hint">{t.deduct_hint}</p>
      </section>

      <section class="box">
        <h2>{t.h_defaults}</h2>
        <label class="check"><input id="sGroup" type="checkbox" checked={s.group} onChange={e => onSettings({ group: e.currentTarget.checked })} /> {t.o_group}</label>
        <label class="check"><input id="sMerge" type="checkbox" checked={s.merge} onChange={e => onSettings({ merge: e.currentTarget.checked })} /> {t.o_merge}</label>
        <label class="check"><input id="sDiag" type="checkbox" checked={s.printDiagrams} onChange={e => onSettings({ printDiagrams: e.currentTarget.checked })} /> {t.o_diagrams}</label>
        <h2 style={{ marginTop: "6px" }}>{t.h_cols}</h2>
        <div class="cols cols4">
          {COLS.map(c => (
            <label key={c.k} class="check">
              <input id={`scol_${c.k}`} type="checkbox" checked={s.cols[c.k]} onChange={e => onSettings({ cols: { ...s.cols, [c.k]: e.currentTarget.checked } })} />
              {t[c.label] as string}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
