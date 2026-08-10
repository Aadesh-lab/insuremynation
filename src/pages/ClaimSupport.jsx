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
import {
  EASE,
  Reveal,
  Stagger,
  staggerItem,
  staggerItemFade,
  staggerPassthrough,
} from '../components/Reveal';
import { BLUE, EMAIL, EMAIL_HREF, PHONE, PHONE_HREF } from '../data/site';

const ISSUES = [
  {
    title: 'Policy mis-sell',
    sub: 'Sold a plan that never matched what was described - we establish it in writing',
  },
  {
    title: 'Delay in settlement',
    sub: 'Claims sitting past the regulatory turnaround get escalated',
  },
  {
    title: 'Rejected claim assistance',
    sub: 'We read the repudiation letter and build the case for review',
  },
  {
    title: 'Revival of lapsed policy',
    sub: 'Bring a lapsed policy back with the least penalty possible',
  },
  {
    title: 'Claim servicing',
    sub: 'Documentation, follow-ups and insurer coordination handled for you',
  },
  {
    title: 'Rejected proposal support',
    sub: 'Declined at underwriting? We find an insurer who will cover you',
  },
];

const FIELDS = [
  { key: 'first', label: 'First name', placeholder: 'Nehal' },
  { key: 'last', label: 'Last name', placeholder: 'Kumar' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com' },
  { key: 'phone', label: 'Contact no.', placeholder: '+91 00000 00000' },
  { key: 'insurer', label: 'Insurer', placeholder: 'Name of the insurance company' },
  { key: 'city', label: 'City', placeholder: 'New Delhi' },
];

const WHY_COPY = [
  'Customers raise complaints against insurers for mis-sold products every day. It surfaces at the worst possible moment - at the time of a claim, when an illness or a loss is already being dealt with.',
  'InsureNation runs a support desk for exactly those cases. We read the policy, establish what was sold against what was promised, and put the case to the insurer in the language and format they respond to.',
  'Our insurance industry experts handhold you through the process so you reach a satisfactory resolution - whether the policy was bought through us or not.',
];

export default function ClaimSupport() {
  const [form, setForm] = useState({});
  const [remarks, setRemarks] = useState('');
  const [sent, setSent] = useState(false);

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
              background: 'url("/assets/claim-hero-parents.webp") center / cover no-repeat',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(0,13,40,0.2) 100%)',
            }}
          />
        </div>

        <Nav variant="white" active="claim" />

        <motion.div
          data-r="htitleblock"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
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
            <Eyebrow color="#fff">[ claim support ]</Eyebrow>
          </motion.div>
          <motion.div variants={staggerItem}>
            <SplitHeading data-r="htitle" lines={['Claims Support', 'When It Matters']} color="#fff" />
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
            A policy is only as good as the claim it pays. If an insurer has delayed, rejected or
            mis-sold, our industry experts take the case up on your behalf.
          </motion.span>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------- WHY */}
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
          <Eyebrow>[ why we do this ]</Eyebrow>
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
              lines={['Grievances', 'Deserve An', 'Expert']}
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

      {/* --------------------------------------------------------- WHAT WE HELP WITH */}
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
          <Eyebrow>[ what we help with ]</Eyebrow>
        </Reveal>
        <Stagger
          data-r="cgrid"
          stagger={0.06}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
            gap: 1,
            background: BLUE,
            width: '100%',
          }}
        >
          {ISSUES.map((issue, i) => (
            <Stagger.Item
              key={issue.title}
              variants={staggerPassthrough}
              style={{
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '40px 34px',
                boxSizing: 'border-box',
              }}
            >
              <Stagger.Item
                as="span"
                variants={staggerItemFade}
                style={{
                  fontFamily: 'Poppins,sans-serif',
                  fontSize: 17,
                  lineHeight: 1,
                  color: 'rgba(0,74,173,0.6)',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </Stagger.Item>
              <Stagger.Item
                as="span"
                variants={staggerItemFade}
                style={{
                  fontFamily: 'Poppins,sans-serif',
                  fontWeight: 700,
                  fontSize: 25,
                  lineHeight: 1.25,
                  color: BLUE,
                  textWrap: 'pretty',
                }}
              >
                {issue.title}
              </Stagger.Item>
              <Stagger.Item
                as="span"
                variants={staggerItemFade}
                style={{
                  fontFamily: 'Poppins,sans-serif',
                  fontWeight: 300,
                  fontSize: 19,
                  lineHeight: 1.45,
                  color: BLUE,
                  textWrap: 'pretty',
                }}
              >
                {issue.sub}
              </Stagger.Item>
            </Stagger.Item>
          ))}
        </Stagger>
      </div>

      {/* ---------------------------------------------------------- SUPPORT FORM */}
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
          <Eyebrow>[ get support for your claim ]</Eyebrow>
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
            <SplitHeading data-r="qhead" lines={['Raise Your', 'Case With Us']} fontSize={52} />
            <Body>
              Tell us what happened in a few lines. Keep the policy number and any letters from the
              insurer handy - a counsellor will call to collect the documents and set out the next
              steps.
            </Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
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
              label="What happened"
              rows={4}
              value={remarks}
              placeholder="Policy number, insurer, and what went wrong"
              onChange={(e) => {
                setRemarks(e.target.value);
                setSent(false);
              }}
            />
            <SubmitRow
              sent={sent}
              onClick={() => setSent(true)}
              label={sent ? 'Case received' : 'Get claim support'}
              note={
                sent
                  ? 'Thanks - an expert will call you within one working day.'
                  : 'Your details stay with our claims desk. No marketing calls.'
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
