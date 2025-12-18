(async () => {
  const NETLIFY_FN = '/.netlify/functions/supabase-proxy';
  const ZONE = document.currentScript.getAttribute('data-zone') || 'Crochet';
  const SLOT = document.currentScript.parentElement;

  let ads = [];
  let currentIndex = 0;

  async function api(action, payload = {}) {
    try {
      const res = await fetch(NETLIFY_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data || [];
    } catch (err) {
      console.error('Ad API error:', err);
      return [];
    }
  }

  async function loadAds() {
    const data = await api('getAds', { zone: ZONE });
    ads = (data || []).filter(a => a.active);
    if (ads.length === 0) {
      SLOT.innerHTML = `
        <a href="https://claudecolab.com/support" target="_blank" rel="noopener" style="display:block;text-align:center;padding:15px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:8px;text-decoration:none;">
          <div style="color:#fff;font-size:14px;font-weight:bold;margin-bottom:5px;">Support Our Network</div>
          <div style="color:rgba(255,255,255,0.8);font-size:12px;">Help us keep these sites free</div>
        </a>
      `;
      return;
    }
    showAd();
    setInterval(showAd, 20000);
  }

  function showAd() {
    if (ads.length === 0) return;
    const ad = ads[currentIndex];
    currentIndex = (currentIndex + 1) % ads.length;

    SLOT.innerHTML = `
      <a href="${ad.target_url}" target="_blank" rel="noopener" data-ad-id="${ad.id}" style="display:block;">
        <img src="${ad.image_url}" alt="${ad.title}" style="width:100%;height:auto;border-radius:8px;display:block;">
      </a>
    `;
  }

  loadAds();
})();
