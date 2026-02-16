(function () {
  "use strict";

  const CURRENCY_SYMBOLS = {
    NGN: "\u20A6",
    GHS: "GH\u20B5",
    ZAR: "R",
    KES: "KSh",
    USD: "$",
  };

  function getShop() {
    const el =
      document.getElementById("payafrika-subscribe-btn") ||
      document.getElementById("payafrika-plan-picker");
    return el ? el.dataset.shop : window.Shopify?.shop || "";
  }

  function formatPrice(amount, currency) {
    const sym = CURRENCY_SYMBOLS[currency] || currency;
    return sym + " " + (amount / 100).toLocaleString();
  }

  // Fetch plans from proxy API
  async function fetchPlans() {
    const shop = getShop();
    const resp = await fetch("/apps/payafrika/api/plans?shop=" + encodeURIComponent(shop));
    if (!resp.ok) throw new Error("Failed to load plans");
    return resp.json();
  }

  // Render plan cards into an element
  function renderPlanCards(container, plans) {
    if (!plans || plans.length === 0) {
      container.innerHTML = '<p class="payafrika-loading">No plans available.</p>';
      return;
    }

    container.innerHTML = plans
      .map(function (plan) {
        return (
          '<div class="payafrika-plan-card">' +
          '<div class="payafrika-plan-name">' + escapeHtml(plan.name) + "</div>" +
          '<div class="payafrika-plan-price">' + formatPrice(plan.amount, plan.currency) + "</div>" +
          '<div class="payafrika-plan-interval">per ' + plan.interval + "</div>" +
          (plan.trialDays > 0
            ? '<div class="payafrika-plan-trial">' + plan.trialDays + "-day free trial</div>"
            : "") +
          '<button class="payafrika-btn payafrika-btn-primary payafrika-btn-sm" onclick="PayAfrika.showSubscribeForm(\'' +
          plan.id + "', '" + escapeHtml(plan.name) + "')\">Subscribe</button>" +
          "</div>"
        );
      })
      .join("");
  }

  function showSubscribeForm(planId, planName) {
    var modal = document.getElementById("payafrika-modal");
    var body = document.getElementById("payafrika-modal-body");

    if (!modal) {
      // Create modal if using plan-picker block (no modal in DOM)
      var wrapper = document.createElement("div");
      wrapper.innerHTML =
        '<div id="payafrika-modal" class="payafrika-modal">' +
        '<div class="payafrika-modal-content">' +
        '<div class="payafrika-modal-header"><h3>Subscribe</h3>' +
        '<button class="payafrika-modal-close" onclick="PayAfrika.closeModal()">&times;</button></div>' +
        '<div id="payafrika-modal-body" class="payafrika-modal-body"></div></div></div>';
      document.body.appendChild(wrapper.firstChild);
      modal = document.getElementById("payafrika-modal");
      body = document.getElementById("payafrika-modal-body");
    }

    body.innerHTML =
      '<h3 style="margin-bottom:16px;">Subscribe to ' + escapeHtml(planName) + "</h3>" +
      '<form class="payafrika-form" onsubmit="PayAfrika.handleSubscribe(event, \'' + planId + "')\">" +
      '<label>Email *</label><input type="email" name="email" required placeholder="your@email.com" />' +
      '<label>Phone (optional)</label><input type="tel" name="phone" placeholder="+234..." />' +
      '<label>Promo Code (optional)</label><input type="text" name="promoCode" placeholder="SAVE20" />' +
      '<button type="submit" class="payafrika-btn payafrika-btn-primary" style="width:100%">Subscribe Now</button>' +
      "</form>";

    modal.style.display = "flex";
  }

  async function handleSubscribe(e, planId) {
    e.preventDefault();
    var form = e.target;
    var btn = form.querySelector('button[type="submit"]');
    btn.textContent = "Processing...";
    btn.disabled = true;

    var shop = getShop();
    var data = {
      email: form.email.value,
      phone: form.phone.value,
      promoCode: form.promoCode.value,
    };

    try {
      var resp = await fetch("/apps/payafrika/api/subscribe?shop=" + encodeURIComponent(shop), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: planId, ...data }),
      });

      var result = await resp.json();
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        btn.textContent = "Subscribe Now";
        btn.disabled = false;
        alert(result.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      btn.textContent = "Subscribe Now";
      btn.disabled = false;
      alert("Network error. Please try again.");
    }
  }

  function openSubscribe() {
    var modal = document.getElementById("payafrika-modal");
    var body = document.getElementById("payafrika-modal-body");
    body.innerHTML = '<p class="payafrika-loading">Loading plans...</p>';
    modal.style.display = "flex";

    fetchPlans().then(function (data) {
      renderPlanCards(body, data.plans);
    }).catch(function () {
      body.innerHTML = '<p>Unable to load plans. Please try again later.</p>';
    });
  }

  function closeModal() {
    var modal = document.getElementById("payafrika-modal");
    if (modal) modal.style.display = "none";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Auto-init plan picker
  document.addEventListener("DOMContentLoaded", function () {
    var picker = document.getElementById("payafrika-plan-picker");
    if (picker) {
      fetchPlans().then(function (data) {
        renderPlanCards(picker, data.plans);
      }).catch(function () {
        picker.innerHTML = '<p>Unable to load plans.</p>';
      });
    }
  });

  // Expose API
  window.PayAfrika = {
    openSubscribe: openSubscribe,
    closeModal: closeModal,
    showSubscribeForm: showSubscribeForm,
    handleSubscribe: handleSubscribe,
  };
})();
