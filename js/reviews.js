(function () {
  'use strict';

  var GOOGLE_PROFILE_URL = 'https://share.google/4bSy3SlN38ib1YCox';
  var googleReviews = [
    { name: 'Amanda Brassard', rating: 1, date: '9 months ago', text: 'This guy is a complete rip off. Firstly he’s advertising for an hour session of blue light technology. Then he gives you 2x15 minute sessions and waffles on about a load of rubbish for 15 minutes. I actually had to ask him to start the treatment. I then get home and check the advert it definitely says. One hour blue light. So I message him and he says no it’s not an hour it’s 2x 15 minutes but the whole session takes an hour? Im like what are you on about? He then starts saying that the dentist boards say they can only legally do 30 minutes when I check it’s not even a legal service? Sending me huge essays of utter rubbish whilst THINKING he’s going to rip me off 50 quid. Please DON NOT USE at all costs. He’s not even in a salon but some dingy house?' },
    { name: 'marf warden', rating: 5, date: 'a year ago', text: 'Alex was really nice, made me feel at ease. He was very thorough and explained everything as he was going along. Really professional and would definitely recommend. He was respectful and turned around when I dribbled all down myself taking the mouthpiece out ha! Teeth are getting whiter too! 10/10 😊' },
    { name: 'Sunita Hitang', rating: 5, date: '9 months ago', text: 'My teeth are noticeably whiter, smoother. The whole process was comfortable and professional from start to finish. Fantastic Results, Great Price, and Amazing Service!' },
    { name: 'Emma McLaren', rating: 5, date: '2 years ago', text: 'Alex is very good and professional I can see amazing results after even one session! Thank you for making my smile brighter I will definitely be back would recommend Alex to anyone that’s thinking about getting it done thank you!' },
    { name: 'Carmen Ruthia Ramírez-kara', rating: 5, date: '10 months ago', text: 'Booked session for me and my partner was a great experience and results, professional service would definitely return.' },
    { name: 'darrell coombes', rating: 5, date: '2 years ago', text: 'Alex was very attentive. He explained the process from start to finish. Just within the first session the results were amazing. Would definitely recommend and will be going back again.' },
    { name: 'kim hurley', rating: 5, date: '2 years ago', text: "Alex and his team are fantastic - I've seen their results on a few people. He's thorough, professional and a really nice guy. I wouldn't hesitate to recommend him." },
    { name: 'Cameron Loseby', rating: 5, date: 'a year ago', text: '1-hour teeth whitening with Alex at Mr. White was quick, effective, and comfortable. My teeth definitely look whiter than before. Highly recommend!' },
    { name: 'Paula Angel', rating: 5, date: '2 years ago', text: 'Alex did a very good job! I would recommend him! He is very professional and he makes sure you are happy with the result! Thank you!' },
    { name: 'Sam Elliot', rating: 5, date: '2 years ago', text: 'A relaxed procedure with instant results. I’ll definitely be going back for a second time to go that extra little bit whiter but I can’t fault Alex or these results at all. Zero sensitivity after the procedure, money well spent!' },
    { name: 'Emilie Penlington', rating: 5, date: 'a year ago', text: 'Really happy with results, teeth were noticeably whiter after one session and price was really reasonable compared to other places.' },
    { name: 'Susan Hillesdon', rating: 5, date: '2 years ago', text: 'Highly recommend this service. Very clean facility, hygiene is taken very seriously. Alex is a very friendly person, makes you feel relaxed during the procedure and explains the whole process. The product has worked really well and my teeth look fantastic — noticeable difference after first treatment and well worth the money.' },
    { name: 'Lawrence Prodger', rating: 5, date: '2 years ago', text: 'Great service, great product, great results after first session. Highly recommended, great value for money and Alex is a very helpful guy. Will be going again.' },
    { name: 'Steven Martin', rating: 5, date: '2 years ago', text: 'Booked in with Mr White Friday morning, fantastic service and really good quality product. 100% recommend to anyone who is looking to get their teeth whitened.' },
    { name: 'Jessica Farrar', rating: 5, date: '2 years ago', text: 'Thank you so much! Really happy with the results, would completely recommend to anyone! 😊😊' },
    { name: 'Matty', rating: 5, date: '2 years ago', text: 'Excellent service by a very professional young man. Very pleased with the outcome — who needs Turkey teeth?' },
    { name: 'Stacey', rating: 5, date: '2 years ago', text: 'Very happy with my results, would definitely recommend!' },
    { name: 'Steven Lummis', rating: 5, date: '2 years ago', text: 'Great guy, great results and definitely recommend.' },
    { name: 'Ryan Way', rating: 5, date: '2 years ago', text: 'Really good service, very professional. Would recommend.' },
    { name: 'Lewis Eallett', rating: 5, date: '2 years ago', text: 'Great product, even greater results.' },
    { name: 'Iwona Kuc', rating: 5, date: '2 years ago', text: 'Excellent service by the professional Mr White.' },
    { name: 'Antony Stanley', rating: 5, date: '2 years ago', text: 'Very happy with result.' },
    { name: 'Hannah Bullock', rating: 5, date: '2 years ago', text: 'Great place, affordable as well.' },
    { name: 'solène Guillossou', rating: 5, date: '2 years ago', text: '5-star rating on Google.' },
    { name: 'Lee Norgan', rating: 5, date: '2 years ago', text: '5-star rating on Google.' }
  ].map(function (review) {
    review.source = 'google';
    review.url = GOOGLE_PROFILE_URL;
    return review;
  });

  var reviews = googleReviews.slice();
  var currentIndex = 0;
  var timer = null;
  var card = document.getElementById('reviewCard');
  var stars = document.getElementById('reviewStars');
  var quote = document.getElementById('reviewQuote');
  var author = document.getElementById('reviewAuthor');
  var meta = document.getElementById('reviewMeta');
  var source = document.getElementById('reviewSource');
  var counter = document.getElementById('reviewCounter');
  var prev = document.getElementById('reviewPrev');
  var next = document.getElementById('reviewNext');

  function renderReview(index) {
    if (!reviews.length || !card) return;
    currentIndex = (index + reviews.length) % reviews.length;
    var review = reviews[currentIndex];
    var rating = Number(review.rating) || 0;

    stars.textContent = rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : 'Website review';
    stars.setAttribute('aria-label', rating ? rating + ' out of 5 stars' : 'Website review');
    stars.classList.toggle('website-stars', !rating);
    quote.textContent = '“' + (review.message || review.text) + '”';
    author.textContent = review.name;
    meta.textContent = review.date || formatDate(review.createdAt);
    source.textContent = review.source === 'website' ? 'Submitted on this website' : 'Google Review';
    source.href = review.source === 'website' ? '#leave-review' : GOOGLE_PROFILE_URL;
    source.removeAttribute('target');
    source.removeAttribute('rel');
    if (review.source !== 'website') {
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
    }
    counter.textContent = (currentIndex + 1) + ' / ' + reviews.length;
  }

  function formatDate(value) {
    if (!value) return 'Recently';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function startTimer() {
    window.clearInterval(timer);
    timer = window.setInterval(function () { renderReview(currentIndex + 1); }, 6500);
  }

  function move(amount) {
    renderReview(currentIndex + amount);
    startTimer();
  }

  if (prev && next) {
    prev.addEventListener('click', function () { move(-1); });
    next.addEventListener('click', function () { move(1); });
  }
  if (card) {
    card.addEventListener('mouseenter', function () { window.clearInterval(timer); });
    card.addEventListener('mouseleave', startTimer);
    card.addEventListener('focusin', function () { window.clearInterval(timer); });
    card.addEventListener('focusout', startTimer);
  }

  async function loadWebsiteReviews() {
    try {
      var response = await fetch('/api/reviews', { headers: { Accept: 'application/json' } });
      var result = await response.json();
      if (!response.ok || !Array.isArray(result.reviews)) return;
      var websiteReviews = result.reviews.map(function (review) {
        review.source = 'website';
        return review;
      });
      reviews = websiteReviews.concat(googleReviews);
      renderReview(0);
    } catch (_) {
      // The verified Google reviews remain available if the live endpoint is unavailable.
    }
  }

  var form = document.getElementById('websiteReviewForm');
  var formStatus = document.getElementById('websiteReviewStatus');
  if (form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var name = String(data.get('name') || '').trim();
      var message = String(data.get('message') || '').trim();
      var submit = form.querySelector('button[type="submit"]');

      if (name.length < 2 || message.length < 10) {
        formStatus.textContent = 'Please add your name and a short review of at least 10 characters.';
        formStatus.className = 'form-status error';
        return;
      }

      submit.disabled = true;
      formStatus.textContent = 'Publishing your review…';
      formStatus.className = 'form-status';

      try {
        var response = await fetch('/api/reviews', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, message: message, website: String(data.get('website') || '') })
        });
        var result = await response.json().catch(function () { return null; });
        if (!response.ok || !result || !result.ok) {
          throw new Error(result && result.error ? result.error : 'We could not publish your review.');
        }
        form.reset();
        result.review.source = 'website';
        reviews.unshift(result.review);
        renderReview(0);
        startTimer();
        formStatus.textContent = 'Thank you — your review is now live in the slideshow.';
        formStatus.className = 'form-status success';
        document.getElementById('reviews-slideshow').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (error) {
        formStatus.textContent = error.message || 'We could not publish your review. Please try again.';
        formStatus.className = 'form-status error';
      } finally {
        submit.disabled = false;
      }
    });
  }

  renderReview(0);
  startTimer();
  loadWebsiteReviews();
})();
