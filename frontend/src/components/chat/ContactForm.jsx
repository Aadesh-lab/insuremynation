import { useRef, useState } from 'react';
import { BLUE } from '../../data/site';
import { contactError, formatContact } from './contactAsk';
import { COUNTRIES, DEFAULT_DIAL, flagOf } from './countries';

/**
 * The reply to the assistant's contact question, as fields instead of a paragraph.
 *
 * It does **not** capture anything: `onSubmit` sends a normal chat message to imagine.bo, who
 * own the lead and the CRM. This is an input method for their question — which is also why the
 * composer stays visible underneath it, and why the consent sentence is left where it is, in
 * their bubble above, rather than being restated or reduced to a tickbox here.
 */
export default function ContactForm({ onSubmit, disabled }) {
  const [name, setName] = useState('');
  const [dial, setDial] = useState(DEFAULT_DIAL);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // Errors appear on submit, not while typing: a message that argues with a half-typed number
  // is noise.
  const [error, setError] = useState(null);
  const nameRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    if (disabled) return;
    const fields = { name, dial, phone, email };
    const problem = contactError(fields);
    if (problem) {
      setError(problem);
      return;
    }
    onSubmit(formatContact(fields));
  };

  return (
    <form className="imn-chat-contact" onSubmit={submit} style={wrap}>
      <Row label="Your name">
        <input
          ref={nameRef}
          className="imn-chat-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Nehal Kumar"
          style={input}
        />
      </Row>

      <Row label="Mobile number">
        <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
          {/* A native select: the OS picker on a phone, type-to-filter on a desktop, and
              keyboard accessible without any of it being written here. 239 options is
              nothing, and a custom combobox would be worse in every one of those ways. */}
          <select
            className="imn-chat-field"
            value={dial}
            onChange={(e) => setDial(e.target.value)}
            aria-label="Country dialling code"
            style={{ ...input, flex: '0 0 auto', maxWidth: 132 }}
          >
            {COUNTRIES.map(([code, d, country]) => (
              // The dial code is not unique — +1 covers twenty territories — so the ISO code
              // keys the option and the value carries both.
              <option key={code} value={d}>
                {flagOf(code)} {d} {country}
              </option>
            ))}
          </select>
          <input
            className="imn-chat-field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            // `tel` rather than number: a number input strips leading zeros and offers
            // spinners, neither of which belongs on a phone number.
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="99101 69789"
            style={{ ...input, flex: 1, minWidth: 0 }}
          />
        </div>
      </Row>

      <Row label="Email (optional)">
        <input
          className="imn-chat-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          style={input}
        />
      </Row>

      {error && (
        <div role="alert" style={{ fontSize: 12, color: 'rgb(150,30,33)' }}>
          {error}
        </div>
      )}

      <button type="submit" className="imn-chat-submit" disabled={disabled} style={button}>
        Send my details
      </button>

      <p style={note}>Or type your answer below instead.</p>
    </form>
  );
}

function Row({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(0,30,71,0.65)' }}>{label}</span>
      {children}
    </label>
  );
}

const wrap = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '10px 16px 12px',
  borderTop: '1px solid rgba(0,74,173,0.12)',
  flexShrink: 0,
  background: '#fff',
};

const input = {
  appearance: 'none',
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  border: '1.5px solid rgba(0,74,173,0.22)',
  borderRadius: 10,
  padding: '9px 10px',
  fontFamily: 'inherit',
  fontWeight: 300,
  fontSize: 14,
  lineHeight: 1.3,
  color: BLUE,
  background: '#fff',
};

const button = {
  appearance: 'none',
  border: 0,
  borderRadius: 10,
  padding: '11px 14px',
  marginTop: 2,
  fontFamily: 'inherit',
  fontWeight: 500,
  fontSize: 14,
  color: '#fff',
  background: BLUE,
  cursor: 'pointer',
};

const note = {
  margin: 0,
  fontSize: 11,
  fontWeight: 300,
  lineHeight: 1.4,
  color: 'rgba(0,30,71,0.55)',
  textAlign: 'center',
};
