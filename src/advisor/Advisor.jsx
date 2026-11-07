import { useState, useRef, useEffect } from 'react';
import { detectSegment, getEligibleProducts, recommendBundle, calculateQuote } from '../engine/rulesEngine';

const TRANSLATIONS = {
  en: {
    greeting: "Hi! I'm your Accel Business advisor. I'll help you find the right digital bundle for your business. Let's start — what type of business do you run?",
    askCity: "Great! Which city is your business in? And is it Tier 1 (metro like Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad) or Tier 2?",
    askStaff: "How many employees do you have?",
    askSites: "How many business locations/sites do you operate?",
    askTools: "What internet or telecom setup do you currently use? (e.g., mobile hotspot, broadband, leased line)",
    askGstin: "Do you have a GSTIN (GST registration)?",
    recommend: "Based on your business profile, here's what I recommend:",
    noProducts: "I couldn't find eligible products for your profile. Let me connect you with a representative.",
    proceed: "Would you like to proceed with this bundle? You can add or remove items in the next step.",
  },
  hi: {
    greeting: "नमस्ते! मैं आपका Accel Business सलाहकार हूँ। मैं आपके व्यापार के लिए सही डिजिटल बंडल खोजने में मदद करूँगा। शुरू करते हैं — आप कौन सा व्यापार करते हैं?",
    askCity: "बढ़िया! आपका व्यापार किस शहर में है? और क्या यह Tier 1 (मुंबई, दिल्ली जैसा मेट्रो) या Tier 2 है?",
    askStaff: "आपके पास कितने कर्मचारी हैं?",
    askSites: "आप कितनी जगहों/साइट्स पर काम करते हैं?",
    askTools: "आप अभी कौन सा इंटरनेट या टेलीकॉम सेटअप इस्तेमाल करते हैं?",
    askGstin: "क्या आपके पास GSTIN (GST रजिस्ट्रेशन) है?",
    recommend: "आपकी व्यावसायिक प्रोफ़ाइल के अनुसार, यह मेरी सिफारिश है:",
    noProducts: "आपकी प्रोफ़ाइल के लिए उपयुक्त उत्पाद नहीं मिले। मैं आपको एक प्रतिनिधि से जोड़ता हूँ।",
    proceed: "क्या आप इस बंडल के साथ आगे बढ़ना चाहेंगे?",
  },
};

const FLOW_STEPS = ['greeting', 'askCity', 'askStaff', 'askSites', 'askTools', 'askGstin', 'recommend'];

export default function Advisor({ catalogue, lang, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [flowStep, setFlowStep] = useState(0);
  const [profile, setProfile] = useState({
    businessType: '', segment: '', city: '', cityTier: 1,
    employees: 1, sites: 1, currentTools: '', hasGstin: false,
  });
  const [bundleReady, setBundleReady] = useState(false);
  const [recommendedItems, setRecommendedItems] = useState([]);
  const chatRef = useRef(null);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  useEffect(() => {
    setMessages([{ role: 'bot', text: t.greeting }]);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', text: userMsg }];

    const updatedProfile = { ...profile };

    if (flowStep === 0) {
      updatedProfile.businessType = userMsg;
      updatedProfile.segment = detectSegment(userMsg);
      newMessages.push({ role: 'bot', text: t.askCity });
    } else if (flowStep === 1) {
      updatedProfile.city = userMsg;
      const lower = userMsg.toLowerCase();
      const tier1Cities = ['mumbai','delhi','bangalore','bengaluru','chennai','hyderabad','kolkata','pune','ahmedabad'];
      updatedProfile.cityTier = tier1Cities.some(c => lower.includes(c)) || lower.includes('tier 1') || lower.includes('metro') ? 1 : 2;
      newMessages.push({ role: 'bot', text: t.askStaff });
    } else if (flowStep === 2) {
      const num = parseInt(userMsg.replace(/[^0-9]/g, '')) || 1;
      updatedProfile.employees = num;
      newMessages.push({ role: 'bot', text: t.askSites });
    } else if (flowStep === 3) {
      const num = parseInt(userMsg.replace(/[^0-9]/g, '')) || 1;
      updatedProfile.sites = num;
      newMessages.push({ role: 'bot', text: t.askTools });
    } else if (flowStep === 4) {
      updatedProfile.currentTools = userMsg;
      newMessages.push({ role: 'bot', text: t.askGstin });
    } else if (flowStep === 5) {
      const hasGstin = /yes|haan|ha|y|है/i.test(userMsg);
      updatedProfile.hasGstin = hasGstin;

      const eligible = getEligibleProducts(updatedProfile, catalogue);
      if (eligible.length === 0) {
        newMessages.push({ role: 'bot', text: t.noProducts });
      } else {
        const bundle = recommendBundle(updatedProfile, catalogue);
        const quote = calculateQuote(bundle, catalogue);
        setRecommendedItems(bundle);

        let explanation = t.recommend + '\n\n';
        explanation += `**Your Business:** ${updatedProfile.businessType} (${updatedProfile.segment === 'micro' ? 'Micro retail' : updatedProfile.segment === 'prof' ? 'Professional office' : updatedProfile.segment === 'multi' ? 'Multi-site business' : 'Manufacturer'})\n`;
        explanation += `**City:** ${updatedProfile.city} (Tier ${updatedProfile.cityTier})\n\n`;
        explanation += `**Recommended Bundle:**\n`;
        for (const item of quote.lineItems) {
          explanation += `• ${item.product_name} × ${item.quantity} — ₹${item.monthlySubtotal.toLocaleString('en-IN')}/mo\n`;
        }
        explanation += `\n**Monthly Total: ₹${quote.monthlyTotal.toLocaleString('en-IN')}**\n`;
        if (quote.setupTotal > 0) explanation += `Setup Fee: ₹${quote.setupTotal.toLocaleString('en-IN')}\n`;
        explanation += `Contract: ${quote.maxContract} months\n\n`;

        if (!hasGstin) {
          const gstinProducts = catalogue.filter(p => p.requires_gstin === 'Y');
          const excluded = gstinProducts.map(p => p.product_name).join(', ');
          explanation += `Note: Without a GSTIN, these products are not available: ${excluded}\n\n`;
        }

        explanation += t.proceed;
        newMessages.push({ role: 'bot', text: explanation, isRecommendation: true });
        setBundleReady(true);
      }
    }

    setProfile(updatedProfile);
    setMessages(newMessages);
    setFlowStep(f => f + 1);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
        <h2 className="text-white font-semibold text-lg">AI Business Advisor</h2>
        <p className="text-red-100 text-sm">Get a personalised bundle recommendation</p>
      </div>

      <div ref={chatRef} className="h-[28rem] overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-red-600 text-white rounded-2xl rounded-br-sm'
                : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm'
            }`}>
              {msg.text.split('\n').map((line, j) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={j} className="font-bold">{line.replace(/\*\*/g, '')}</p>;
                }
                if (line.startsWith('• ')) {
                  return <p key={j} className="ml-2">{line}</p>;
                }
                return <p key={j}>{line}</p>;
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-4">
        {bundleReady ? (
          <div className="flex gap-3">
            <button onClick={() => onComplete(profile, recommendedItems)}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors">
              Proceed to Quote →
            </button>
            <button className="px-4 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50">
              Talk to a person
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type your answer..."
              className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button onClick={handleSend}
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-700">
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
