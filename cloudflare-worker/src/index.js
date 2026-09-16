import { serveStatic } from 'cloudflare:assets';

// We'll also need to implement the API handlers.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Serve static assets for known extensions and root
    if (pathname === '/' || 
        pathname.endsWith('.html') || 
        pathname.endsWith('.css') || 
        pathname.endsWith('.js') || 
        pathname.endsWith('.svg') || 
        pathname.endsWith('.png') || 
        pathname.endsWith('.jpg') || 
        pathname.endsWith('.jpeg') || 
        pathname.endsWith('.webp') || 
        pathname.endsWith('.ico') || 
        pathname.endsWith('.json')) {
      return await serveStatic(request, env.ASSETS);
    }

    // API Routes
    if (pathname.startsWith('/api/')) {
      return await handleApiRequest(request, env);
    }

    // For any other route, try to serve as static (for SPA-like behavior, but we don't have SPA)
    // Or return 404
    return await serveStatic(new Request('http://localhost/index.html', request), env.ASSETS);
  }
};

async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  if (pathname === '/api/send-email' && request.method === 'POST') {
    return handleSendEmail(request, env);
  }
  
  if (pathname === '/api/quiz' && request.method === 'POST') {
    return handleQuiz(request, env);
  }
  
  // Add more API endpoints as needed...
  
  return new Response('Not Found', { status: 404 });
}

async function handleSendEmail(request, env) {
  try {
    const { name, company, email, phone, service, message } = await request.json();
    
    // Validation
    if (!name || !email || !service || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Store in KV (if configured)
    if (env.ENQUIRY_STORE) {
      const id = crypto.randomUUID();
      const enquiry = {
        id,
        name,
        company: company || '',
        email,
        phone: phone || '',
        service,
        message,
        created_at: new Date().toISOString(),
        emailed_at: null
      };
      
      await env.ENQUIRY_STORE.put(id, JSON.stringify(enquiry));
    }
    
    // TODO: Send email via external service (SendGrid, Mailgun, etc.)
    // For now, just acknowledge receipt
    
    return new Response(JSON.stringify({ success: true, message: 'Enquiry received' }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

async function handleQuiz(request, env) {
  try {
    const { teamSize, itSpend, painPoints } = await request.json();
    
    // Quiz logic (same as your existing implementation)
    let score = 0;
    
    if (teamSize <= 5) score += 10;
    else if (teamSize <= 20) score += 20;
    else score += 30;
    
    if (itSpend < 5000) score += 10;
    else if (itSpend < 20000) score += 20;
    else score += 30;
    
    const painScore = painPoints.reduce((acc, p) => {
      if (p === "manual_work" || p === "scaling" || p === "security") acc += 15;
      if (p === "ai_automation") acc += 20;
      return acc;
    }, 0);
    
    score += Math.min(painScore, 40);
    
    let tier, description, nextStep, findings, estimatedSavings;
    
    if (score < 35) {
      tier = "Foundation";
      description = "Your IT setup is basic but functional. You're likely paying for reactive fixes instead of proactive management — a common pattern for teams under 20 staff.";
      nextStep = "Book a free 30-minute audit call and we'll show you exactly where you're leaving money on the table.";
      findings = [
        "Team size suggests you may be overpaying for enterprise-tier tools you don't use",
        "Low IT spend often means reactive break-fix — each unplanned outage costs 5–10× more than prevention",
        "Manual work pain points indicate automation ROI of 3–6 months"
      ];
      estimatedSavings = "RM 18,000–36,000/year by shifting from reactive to managed IT";
    } else if (score < 60) {
      tier = "Growth";
      description = "You're scaling fast but your IT hasn't kept up. Security gaps, undocumented processes, and tool sprawl are your biggest risks right now.";
      nextStep = "Schedule a Growth assessment — we map your current stack and show you the exact migration path.";
      findings = [
        "Scaling pain points mean your infrastructure is a bottleneck — every new hire amplifies the problem",
        "Security/compliance gaps expose you to PDPA fines up to RM 1,000,000",
        "Your IT spend is likely 30–50% below what companies your size typically need"
      ];
      estimatedSavings = "RM 48,000–96,000/year with proper cloud migration and managed security";
    } else {
      tier = "AI Partner";
      description = "You're ready for AI-first operations. Your team has the scale and the pain points that AI automation solves fastest — this is where the biggest ROI lives.";
      nextStep = "Let us build a custom AI roadmap for your team — we start with a 1-hour discovery workshop.";
      findings = [
        "AI automation needs combined with manual work = 40–60% time savings on repetitive tasks",
        "Your team size justifies dedicated AI engineering — the ROI crosses positive within 3 months",
        "Security/compliance concerns + AI = opportunity for a unified PDPA-compliant automation stack"
      ];
      estimatedSavings = "RM 120,000–240,000/year in recovered productivity and reduced headcount needs";
    }
    
    return new Response(JSON.stringify({ 
      tier, 
      score, 
      description, 
      nextStep, 
      findings, 
      estimatedSavings,
      auditDate: new Date().toISOString().split('T')[0]
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}