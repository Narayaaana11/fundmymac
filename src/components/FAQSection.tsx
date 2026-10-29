import React, { useState } from 'react';
import { FAQ_DATA } from '../data/fundMyMacData';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="bmm-faq-section">
      <div className="bmm-section-inner">
        <div className="bmm-pill-badge-blue">
          <span>QUESTIONS & ANSWERS</span>
        </div>
        <h2 className="bmm-auction-h2">Frequently Asked Questions</h2>
        <p className="bmm-auction-desc" style={{ marginBottom: '28px' }}>
          Everything you need to know about sponsoring Fund My Mac, the roadshow, and VESPER.
        </p>

        <div className="bmm-faq-list">
          {FAQ_DATA.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bmm-faq-item"
                onClick={() => toggle(idx)}
              >
                <div className="bmm-faq-q">
                  <span>{faq.question}</span>
                  <span style={{ fontSize: '18px', color: 'var(--ink-2)' }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </div>
                {isOpen && <p className="bmm-faq-a">{faq.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
