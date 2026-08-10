import { useState } from 'react';
import { motion } from 'framer-motion';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import TalkToExperts from '../components/TalkToExperts';
import { MailIcon, PhoneIcon } from '../components/Icons';
import {
  Body,
  Eyebrow,
  Field,
  SplitHeading,
  SubmitRow,
  TextField,
} from '../components/Primitives';
import { EASE, Reveal, Stagger, staggerItem } from '../components/Reveal';
import { BLUE, EMAIL, EMAIL_HREF, PHONE, PHONE_HREF, RED } from '../data/site';

const ROLES = [
  {
    title: 'Health Insurance Counsellor',
    duties: [
      'Drive business through existing customers and data calling',
      'Experience in insurance tele-sales or field sales preferred',
    ],
  },
  {
    title: 'Telecaller',
    duties: [
      'Interact with and drive business from our customers through tele-calling, and generate references',
      'Experience in insurance tele-sales or field sales preferred',
    ],
  },
];

const FIELDS = [
  { key: 'first', label: 'First name', placeholder: 'Nehal' },
  { key: 'last', label: 'Last name', placeholder: 'Kumar' },
  { key: 'mobile', label: 'Mobile no.', placeholder: '+91 00000 00000' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com' },
];

const WHY_COPY = [
  'InsureNation is a boutique insurance firm focused on the HNI segment. We make protecting life, health, superbikes, four-wheelers and travel simpler and more comprehensive, so our clients and their families stay protected wherever they go.',
  'If you are looking for a career in insurance and want the chance to learn from people who have spent decades in it, we welcome you with open arms - experienced or fresher.',
  'Every open role sits in our Connaught Place office in New Delhi, works directly with senior counsellors, and carries an incentive structure with monthly rewards and recognition.',
];

const metaLabel = {
  fontFamily: 'Poppins,sans-serif',
  fontWeight: 500,
  fontSize: 15,
  color: BLUE,
  textTransform: 'uppercase',
};

const metaValue = {
  fontFamily: 'Poppins,sans-serif',
  fontWeight: 300,
  fontSize: 18,
  lineHeight: 1.45,
  color: BLUE,
};

export default function Career() {
  const [role, setRole] = useState('Health Insurance Counsellor');
  const [form, setForm] = useState({});
  const [message, setMessage] = useState('');
  const [file, setFile] = useState('');
  const [sent, setSent] = useState(false);

  const pickRole = (title) => {
    setRole(title);
    setSent(false);
  };

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setSent(false);
  };

  return (
    <div
      className="p-sub"
      data-r="root"
      style={{
        position: 'relative',
        width: 1728,
        background: '#fff',
        fontFamily: 'Poppins,sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ---------------------------------------------------------------- HERO */}
      <div
        data-r="hero"
        style={{
          position: 'relative',
          width: 1728,
          aspectRatio: '16/9',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <div
          data-r="herobg"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            isolation: 'isolate',
          }}
        >
          <motion.div
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease: EASE }}
            style={{
              position: 'absolute',
              inset: 0,
              background: "url('/assets/career-hero-agent.webp') center / cover no-repeat",
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(0,13,40,0.45) 0%, rgba(0,13,40,0.12) 38%, rgba(0,13,40,0.68) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(0,13,40,0.2) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        <Nav variant="white" active="insurance" />

        <motion.div
          data-r="htitleblock"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
          }}
          style={{
            position: 'absolute',
            left: 96,
            bottom: 88,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            alignItems: 'flex-start',
            maxWidth: 1000,
          }}
        >
          <motion.div variants={staggerItem}>
            <Eyebrow color="#fff">[ we are hiring ]</Eyebrow>
          </motion.div>
          <motion.div variants={staggerItem}>
            <SplitHeading data-r="htitle" lines={['Jobs At', 'InsureNation']} color="#fff" />
          </motion.div>
          <motion.span
            data-r="hsub"
            variants={staggerItem}
            style={{
              width: 760,
              fontFamily: 'Poppins,sans-serif',
              fontWeight: 300,
              fontSize: 24,
              lineHeight: 1.4,
              color: '#fff',
              textWrap: 'pretty',
            }}
          >
            A boutique insurance firm in Connaught Place, looking for energetic people with a
            can-do attitude and leadership instincts.
          </motion.span>
        </motion.div>
      </div>

      {/* -------------------------------------------------------------- WHY JOIN */}
      <div
        data-r="why"
        style={{
          position: 'relative',
          width: 1728,
          display: 'flex',
          flexDirection: 'column',
          gap: 56,
          padding: '104px 96px',
          alignItems: 'flex-start',
          boxSizing: 'border-box',
          background: '#fff',
        }}
      >
        <Reveal as="span" y={20} duration={0.5}>
          <Eyebrow>[ why join us ]</Eyebrow>
        </Reveal>
        <div
          data-r="wrow"
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 96,
            alignItems: 'flex-start',
            width: '100%',
          }}
        >
          <Reveal style={{ width: 520, flexShrink: 0 }}>
            <SplitHeading
              data-r="whead"
              lines={['Learn From', 'Industry', 'Experts']}
              style={{ width: '100%' }}
            />
          </Reveal>
          <Stagger
            data-r="wcopy"
            stagger={0.1}
            style={{ width: 900, display: 'flex', flexDirection: 'column', gap: 26 }}
          >
            {WHY_COPY.map((text) => (
              <Stagger.Item key={text} as="span">
                <Body>{text}</Body>
              </Stagger.Item>
            ))}
          </Stagger>
        </div>
      </div>

      {/* ------------------------------------------------------------ OPEN ROLES */}
      <div
        data-r="cover"
        style={{
          position: 'relative',
          width: 1728,
          display: 'flex',
          flexDirection: 'column',
          gap: 56,
          padding: '0 96px 104px',
          alignItems: 'flex-start',
          boxSizing: 'border-box',
        }}
      >
        <Reveal as="span" y={20} duration={0.5}>
          <Eyebrow>[ open roles ]</Eyebrow>
        </Reveal>
        <Stagger
          data-r="rolerow"
          stagger={0.12}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gap: 32,
            width: '100%',
          }}
        >
          {ROLES.map((r, i) => {
            const selected = role === r.title;
            return (
              <Stagger.Item
                key={r.title}
                data-r="rolecard"
                style={{
                  boxShadow: `inset 0 0 0 1px ${BLUE}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 28,
                  padding: '48px 44px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <span
                    style={{
                      fontFamily: 'Poppins,sans-serif',
                      fontWeight: 500,
                      fontSize: 17,
                      lineHeight: 1,
                      color: 'rgba(0,74,173,0.6)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')} — full time
                  </span>
                  <span
                    data-r="rolehead"
                    style={{
                      fontFamily: 'Poppins,sans-serif',
                      fontWeight: 700,
                      fontSize: 40,
                      lineHeight: 1.1,
                      color: BLUE,
                      textTransform: 'uppercase',
                    }}
                  >
                    {r.title}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ ...metaLabel, letterSpacing: '0.02em' }}>Key responsibilities</span>
                  {r.duties.map((d) => (
                    <span
                      key={d}
                      style={{
                        fontFamily: 'Poppins,sans-serif',
                        fontWeight: 300,
                        fontSize: 19,
                        lineHeight: 1.5,
                        color: BLUE,
                        textWrap: 'pretty',
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                    gap: '20px 24px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={metaLabel}>Qualification</span>
                    <span style={metaValue}>Senior secondary, graduate or fresher</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={metaLabel}>Location</span>
                    <span style={metaValue}>Connaught Place, New Delhi</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      gridColumn: 'span 2',
                    }}
                  >
                    <span style={metaLabel}>Benefits</span>
                    <span style={metaValue}>
                      Attractive remuneration, incentives, monthly rewards and recognition
                    </span>
                  </div>
                </div>
                <motion.div
                  onClick={() => pickRole(r.title)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{
                    alignSelf: 'flex-start',
                    background: selected ? BLUE : RED,
                    borderRadius: 52,
                    padding: '18px 40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.25s ease',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Poppins,sans-serif',
                      fontWeight: 500,
                      fontSize: 19,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selected ? 'Selected below' : 'Apply now'}
                  </span>
                </motion.div>
              </Stagger.Item>
            );
          })}
        </Stagger>
      </div>

      {/* ----------------------------------------------------------- APPLICATION */}
      <div
        data-r="quote"
        style={{
          position: 'relative',
          width: 1728,
          display: 'flex',
          flexDirection: 'column',
          gap: 56,
          padding: '0 96px 104px',
          alignItems: 'flex-start',
          boxSizing: 'border-box',
        }}
      >
        <Reveal as="span" y={20} duration={0.5}>
          <Eyebrow>[ apply now ]</Eyebrow>
        </Reveal>
        <div
          data-r="qrow"
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 64,
            alignItems: 'stretch',
            width: '100%',
          }}
        >
          <Reveal
            data-r="qleft"
            style={{
              width: 600,
              flex: '0 0 600px',
              display: 'flex',
              flexDirection: 'column',
              gap: 28,
            }}
          >
            <SplitHeading data-r="qhead" lines={['Send Us', 'Your Application']} fontSize={52} />
            <Body>
              Pick the role you are applying for, tell us a little about yourself and attach your
              CV. Every application is read by a person, and we reply either way.
            </Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <MailIcon fill={BLUE} width={19} />
                <a
                  href={EMAIL_HREF}
                  style={{
                    fontFamily: 'Poppins,sans-serif',
                    fontWeight: 500,
                    fontSize: 21,
                    color: BLUE,
                  }}
                >
                  {EMAIL}
                </a>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <PhoneIcon stroke={BLUE} />
                <a
                  href={PHONE_HREF}
                  style={{
                    fontFamily: 'Poppins,sans-serif',
                    fontWeight: 500,
                    fontSize: 21,
                    color: BLUE,
                  }}
                >
                  {PHONE}
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal
            data-r="qform"
            delay={0.12}
            style={{
              width: 872,
              boxShadow: `inset 0 0 0 1px ${BLUE}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 26,
              padding: '48px 44px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={metaLabel}>Applying for</span>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                {ROLES.map((r) => {
                  const selected = role === r.title;
                  return (
                    <motion.div
                      key={r.title}
                      onClick={() => pickRole(r.title)}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        borderRadius: 52,
                        padding: '12px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease,color 0.2s ease',
                        ...(selected
                          ? { background: BLUE, color: '#fff' }
                          : {
                              background: 'transparent',
                              color: BLUE,
                              boxShadow: 'inset 0 0 0 1px rgba(0,74,173,0.45)',
                            }),
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'Poppins,sans-serif',
                          fontWeight: 500,
                          fontSize: 17,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.title}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <Stagger
              data-r="qfields"
              stagger={0.06}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                gap: '22px 24px',
                width: '100%',
              }}
            >
              {FIELDS.map((field) => (
                <Stagger.Item key={field.key} style={{ minWidth: 0 }}>
                  <Field
                    label={field.label}
                    placeholder={field.placeholder}
                    value={form[field.key] ?? ''}
                    onChange={setField(field.key)}
                  />
                </Stagger.Item>
              ))}
            </Stagger>

            <TextField
              label="Message"
              rows={3}
              value={message}
              placeholder="Tell us about your experience"
              onChange={(e) => {
                setMessage(e.target.value);
                setSent(false);
              }}
            />

            <label style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              <span style={{ ...metaLabel, lineHeight: 1.2 }}>Upload your CV</span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 16,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  boxShadow: 'inset 0 0 0 1px rgba(0,74,173,0.35)',
                  padding: '18px 20px',
                }}
              >
                <input
                  type="file"
                  onChange={(e) => {
                    const picked = e.target.files && e.target.files[0];
                    setFile(picked ? picked.name : '');
                    setSent(false);
                  }}
                  style={{
                    fontFamily: 'Poppins,sans-serif',
                    fontWeight: 300,
                    fontSize: 17,
                    color: BLUE,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'Poppins,sans-serif',
                    fontWeight: 300,
                    fontSize: 15,
                    color: 'rgba(0,74,173,0.7)',
                  }}
                >
                  PDF, JPG, JPEG or DOCX, up to 5 MB
                </span>
              </div>
            </label>

            <SubmitRow
              sent={sent}
              onClick={() => setSent(true)}
              label={sent ? 'Application sent' : 'Submit application'}
              note={
                sent
                  ? 'Thanks - we read every application and will reply either way.'
                  : file
                    ? `${file} attached.`
                    : `Applying for: ${role}`
              }
            />
          </Reveal>
        </div>
      </div>

      <TalkToExperts padding="0" animate />
      <Footer />
    </div>
  );
}
