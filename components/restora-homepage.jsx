"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { getRoleHome, normalizeRole } from "@/lib/roles";

const dishes = [
  { name: "Sunday roast chicken", detail: "Golden, tender & made to share", price: "$18.90", image: "/full chicken.avif", tag: "BEST SELLER" },
  { name: "Smash beef burger", detail: "The one you’ll think about tomorrow", price: "$12.50", image: "/meat burger.avif", tag: "FAN FAVORITE" },
  { name: "Fire-roasted pizza", detail: "A little heat, a lot of cheese", price: "$16.00", image: "/spicy pizza.avif", tag: "CHEF’S PICK" },
  { name: "Creamy comfort pasta", detail: "Slow-simmered, never hurried", price: "$14.50", image: "/pasta.avif", tag: "HOUSE SPECIAL" },
];

const mustTryDishes = [
  { name: "Chicken shawarma", detail: "Warm, juicy & wrapped for the road", price: "$11.50", image: "/chicken shorma.avif", tag: "LUNCH FAVORITE" },
  { name: "Chicken biryani", detail: "Fragrant rice and warming spices", price: "$16.00", image: "/chicken biriyani.avif", tag: "SLOW & LOVELY" },
  { name: "Sesame chicken bites", detail: "Sweet, savory, satisfying crunch", price: "$13.50", image: "/fried-sesame-chicken-balls.avif", tag: "A LITTLE CRUNCH" },
];

const menuItems = [
  ["Crispy chicken burger", "with house sauce & pickles", "$12.50"],
  ["Chicken biryani", "fragrant rice, warming spices", "$16.00"],
  ["Spicy sesame chicken", "crunchy, sticky, a little fiery", "$14.00"],
  ["Classic loaded fries", "golden fries, all the good stuff", "$8.50"],
  ["Garden vegetable pizza", "fresh toppings, stone baked", "$15.00"],
  ["Hot dog, done right", "grilled sausage, signature relish", "$10.00"],
];

const team = [
  { name: "Alex Morgan", role: "Executive chef", initials: "AM", color: "coral" },
  { name: "Jamie Lee", role: "Guest experience", initials: "JL", color: "sage" },
  { name: "Sam Rivera", role: "Head of kitchen", initials: "SR", color: "gold" },
  { name: "Taylor Reed", role: "Restaurant manager", initials: "TR", color: "blue" },
];

const stories = [
  { title: "The secret to our slow Sunday sauce", type: "IN THE KITCHEN", image: "/pasta.avif", time: "5 MIN READ" },
  { title: "A little crunch goes a long way", type: "GOOD FOOD", image: "/fried chicken.jfif", time: "4 MIN READ" },
  { title: "The art of a really good pizza night", type: "OUR TABLE", image: "/full pizza.jfif", time: "6 MIN READ" },
];

const gallery = [
  { src: "/chicken leg with french fry.avif", alt: "Crispy chicken with golden fries" },
  { src: "/pizza.avif", alt: "Freshly baked restaurant pizza" },
  { src: "/choclete dessert.jfif", alt: "Chocolate dessert to finish the meal" },
  { src: "/chicken shorma.avif", alt: "Our signature chicken wrap" },
  { src: "/french fry.avif", alt: "A side of crispy golden fries" },
  { src: "/spicy rice.avif", alt: "A bowl of spicy seasoned rice" },
];

function Eyebrow({ children, light = false }) {
  return <p className={`home-eyebrow${light ? " home-eyebrow-light" : ""}`}>{children}</p>;
}

function SectionHeading({ eyebrow, title, copy, light = false }) {
  return (
    <div className={`home-section-heading reveal${light ? " home-section-heading-light" : ""}`}>
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

function FoodCard({ dish, index }) {
  return (
    <article className="food-card reveal" style={{ "--reveal-order": index }}>
      <div className="food-card-image">
        <img src={dish.image} alt={dish.name} loading="lazy" />
        <span className="food-tag">{dish.tag}</span>
        <span className="food-price">{dish.price}</span>
      </div>
      <div className="food-card-copy">
        <div>
          <h3>{dish.name}</h3>
          <p>{dish.detail}</p>
        </div>
        <span className="food-arrow" aria-hidden="true">↗</span>
      </div>
    </article>
  );
}

export default function RestoraHomepage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authActionError, setAuthActionError] = useState("");
  const navRef = useRef(null);
  const { data: session, isPending, error: sessionError, refetch } = authClient.useSession();
  const user = session?.user;
  const dashboardPath = getRoleHome(normalizeRole(user?.role));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("motion-ready");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => root.classList.remove("motion-ready");
    }

    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((item) => item.classList.add("is-visible"));
      return () => root.classList.remove("motion-ready");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -35px 0px" },
    );

    document.querySelectorAll(".reveal").forEach((item) => observer.observe(item));
    return () => {
      observer.disconnect();
      root.classList.remove("motion-ready");
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!navRef.current?.contains(event.target)) {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function closeMenu() {
    setMenuOpen(false);
    setProfileOpen(false);
    setAuthActionError("");
  }

  async function handleSignOut() {
    setAuthActionError("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setAuthActionError(getAuthErrorMessage(result.error));
        return;
      }

      await refetch();
      closeMenu();
      router.replace("/");
      router.refresh();
    } catch (error) {
      setAuthActionError(getAuthErrorMessage(error));
    }
  }

  return (
    <div className="restora-home" id="top">
      <header className="home-header">
        <div className="home-nav-wrap" ref={navRef}>
          <Link className="home-logo" href="/" aria-label="Restora home" onClick={closeMenu}>
            <span className="home-logo-mark" aria-hidden="true">r.</span>
            <span>restora<span className="home-logo-dot">.</span></span>
          </Link>
          <button
            className="home-menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="home-navigation"
            onClick={() => {
              setMenuOpen((open) => !open);
              setProfileOpen(false);
              setAuthActionError("");
            }}
          >
            <span />
            <span />
          </button>
          <nav className={`home-nav${menuOpen ? " home-nav-open" : ""}`} id="home-navigation" aria-label="Main navigation">
            <a href="#menu" onClick={closeMenu}>Our menu</a>
            <a href="#story" onClick={closeMenu}>Our story</a>
            <a href="#delivery" onClick={closeMenu}>How it works</a>
            <a href="#journal" onClick={closeMenu}>Journal</a>
            {isPending ? (
              <span className="home-auth-loading" aria-label="Checking your session" />
            ) : user ? (
              <div className={`home-profile${profileOpen ? " home-profile-open" : ""}`}>
                <button
                  className="home-profile-trigger"
                  type="button"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setProfileOpen((open) => !open);
                    setAuthActionError("");
                  }}
                >
                  {user.image ? (
                    <img className="home-profile-avatar" src={user.image} alt="" />
                  ) : (
                    <span className="home-profile-avatar home-profile-initials" aria-hidden="true">
                      {(user.name?.trim() || user.email || "R").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="home-profile-trigger-name">{user.name?.trim() || "My account"}</span>
                  <svg aria-hidden="true" className="home-profile-chevron" viewBox="0 0 16 16">
                    <path d="m4 6 4 4 4-4" />
                  </svg>
                </button>
                {profileOpen && (
                  <div className="home-profile-menu" role="menu" aria-label="Profile menu">
                    <div className="home-profile-identity">
                      <strong>{user.name?.trim() || "Restora guest"}</strong>
                      <span>{user.email}</span>
                    </div>
                    <Link href={dashboardPath} role="menuitem" onClick={closeMenu}>
                      <span aria-hidden="true">⌂</span> Dashboard
                    </Link>
                    <button className="home-profile-logout" type="button" role="menuitem" onClick={handleSignOut}>
                      <span aria-hidden="true">↪</span> Log out
                    </button>
                    {authActionError && <p className="home-auth-error" role="alert">{authActionError}</p>}
                  </div>
                )}
              </div>
            ) : sessionError ? (
              <div className="home-auth-status">
                <span role="alert">Couldn’t check your session.</span>
                <button type="button" onClick={() => refetch()}>Try again</button>
              </div>
            ) : (
              <>
                <Link className="home-nav-login" href="/login" onClick={closeMenu}>Log in</Link>
                <Link className="home-button home-button-small" href="/login" onClick={closeMenu}>Sign up <span aria-hidden="true">↗</span></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="home-hero" aria-labelledby="hero-title">
          <div className="home-hero-noise" aria-hidden="true" />
          <div className="home-hero-inner">
            <div className="home-hero-copy">
              <Eyebrow light>GOOD FOOD. GOOD MOOD. GOOD COMPANY.</Eyebrow>
              <h1 id="hero-title">A little more<br />love on <em>every</em><br />plate.</h1>
              <p>Made with care, served with a smile, and always worth saving room for.</p>
              <div className="home-hero-actions">
                <a className="home-button" href="#menu">Explore our menu <span aria-hidden="true">↗</span></a>
                <a className="home-text-link" href="#story"><span className="home-play" aria-hidden="true">▶</span> Get to know us</a>
              </div>
              <div className="home-hero-proof">
                <div className="home-avatar-stack" aria-hidden="true"><span>A</span><span>M</span><span>J</span><span>+</span></div>
                <div><strong>Made for our community</strong><span>Good food brings us together.</span></div>
              </div>
            </div>
            <div className="home-hero-visual">
              <div className="home-hero-orbit" aria-hidden="true" />
              <img className="home-hero-food" src="/full chicken.avif" alt="Restora's signature roast chicken, fresh from the kitchen" fetchPriority="high" />
              <div className="home-hero-sticker"><span>FRESH<br />FROM OUR<br />KITCHEN</span><b>✳</b></div>
              <div className="home-hero-note"><span className="home-note-star">✳</span><span>Made fresh.<br /><strong>Never ordinary.</strong></span></div>
              <span className="home-hero-spark home-spark-one" aria-hidden="true">✦</span>
              <span className="home-hero-spark home-spark-two" aria-hidden="true">✳</span>
            </div>
          </div>
          <div className="home-stats">
            <div><strong>20<span>+</span></strong><span>ways to make it yours</span></div>
            <div><strong>100<span>%</span></strong><span>made with a little love</span></div>
            <div><strong>1<span>K</span></strong><span>happy plates and counting</span></div>
            <div><strong>5<span>★</span></strong><span>the feeling we aim for</span></div>
          </div>
          <a className="home-scroll-cue" href="#must-try"><span /> SCROLL TO FEEL GOOD</a>
        </section>

        <section className="home-section home-cream home-must-try" id="must-try">
          <div className="home-container">
            <SectionHeading eyebrow="A VERY GOOD PLACE TO START" title={<>Must-try dishes.<br /><em>Made to be remembered.</em></>} copy="The classics you love, with a little Restora magic in every bite." />
            <div className="home-food-grid home-food-grid-three">
              {mustTryDishes.map((dish, index) => <FoodCard key={dish.name} dish={dish} index={index} />)}
            </div>
            <a className="home-inline-link" href="#menu">Come hungry, leave happy <span aria-hidden="true">↗</span></a>
          </div>
          <span className="home-decoration home-deco-leaf" aria-hidden="true">✳</span>
        </section>

        <section className="home-partners" aria-label="Our friends and local partners">
          <div className="home-container home-partners-inner">
            <p>GOOD FOOD IS BETTER<br />WHEN IT’S SHARED</p>
            <div className="home-partner-logos" aria-label="Trusted by our community">
              <span>Daily<span className="partner-light">Harvest</span></span>
              <span className="partner-serif">the local table</span>
              <span>● sprout</span>
              <span className="partner-script">Goodfolk</span>
              <span>MARKET <b>✳</b></span>
            </div>
          </div>
        </section>

        <section className="home-section home-white" id="delivery">
          <div className="home-container">
            <div className="home-delivery-intro">
              <div><Eyebrow>FROM OUR KITCHEN TO YOURS</Eyebrow><h2>Good things are<br />on their <em>way.</em></h2></div>
              <p>Craving something delicious? Getting your favorites is as easy as one, two, yum.</p>
              <a className="home-button home-button-dark" href="#menu">Find your new favorite <span aria-hidden="true">↗</span></a>
            </div>
            <div className="home-delivery-grid">
              {[
                { number: "01", title: "Pick your happy", copy: "Find your favorites or discover something new on the menu.", image: "/burger.avif", alt: "A freshly made burger" },
                { number: "02", title: "We make it lovely", copy: "Our kitchen gets to work with fresh ingredients and lots of care.", image: "/chicken leg.avif", alt: "Fresh crispy chicken from our kitchen" },
                { number: "03", title: "Make it a moment", copy: "Set the table, gather your people, and dig into the good stuff.", image: "/set menu.avif", alt: "A generous meal ready to share" },
              ].map((step, index) => (
                <article className="home-delivery-card reveal" key={step.number} style={{ "--reveal-order": index }}>
                  <div className="home-delivery-image"><img src={step.image} alt={step.alt} loading="lazy" /><span>{step.number}</span></div>
                  <div className="home-delivery-copy"><h3>{step.title}</h3><p>{step.copy}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-section home-cream">
          <div className="home-container">
            <SectionHeading eyebrow="THE PEOPLE HAVE SPOKEN" title={<>Fan-favorite dishes.<br /><em>For good reason.</em></>} copy="The orders that make it to the table and disappear before anyone says a word." />
            <div className="home-food-grid">
              {dishes.map((dish, index) => <FoodCard key={dish.name} dish={dish} index={index} />)}
            </div>
            <a className="home-button home-button-dark home-centered-button" href="#menu">See what’s cooking <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section className="home-section home-white" id="story">
          <div className="home-container home-why-grid">
            <div className="home-why-copy reveal">
              <Eyebrow>A TABLE WITH ROOM FOR EVERYONE</Eyebrow>
              <h2>Food tastes better<br />when it’s made with <em>heart.</em></h2>
              <p className="home-why-intro">We’re here for the extra napkin, the last bite debate, and the “we should do this more often” kind of nights.</p>
              <div className="home-perks">
                <div><span className="home-perk-icon">✳</span><p><strong>A kitchen that cares</strong><span>Thoughtful ingredients. Properly good cooking.</span></p></div>
                <div><span className="home-perk-icon">♡</span><p><strong>Here for the little moments</strong><span>For the quick lunch and the long, lovely dinner.</span></p></div>
                <div><span className="home-perk-icon">↗</span><p><strong>Your neighborhood table</strong><span>A warm welcome, every time you walk in.</span></p></div>
              </div>
              <a className="home-inline-link" href="#team">A little more about us <span aria-hidden="true">↗</span></a>
            </div>
            <div className="home-why-collage reveal">
              <div className="home-why-photo home-why-photo-large"><img src="/chicken leg with french fry.avif" alt="Crispy chicken and fries, freshly prepared" loading="lazy" /></div>
              <div className="home-why-photo home-why-photo-small"><img src="/chicken biriyani.avif" alt="A colorful plate of chicken biryani" loading="lazy" /></div>
              <div className="home-why-seal"><span>GOOD FOOD<br />GOOD PEOPLE</span><b>✳</b></div>
              <span className="home-collage-spark" aria-hidden="true">✦</span>
            </div>
          </div>
        </section>

        <section className="home-promo">
          <div className="home-container home-promo-inner">
            <div className="home-promo-copy reveal"><Eyebrow light>A LITTLE SOMETHING EXTRA</Eyebrow><h2>Good things.<br /><em>Better together.</em></h2><p>Bring your favorite people. We’ll take care of the delicious part.</p><a className="home-button" href="#combos">Meet your new combo <span aria-hidden="true">↗</span></a></div>
            <div className="home-promo-image reveal"><img src="/chicken offer.avif" alt="A generous Restora meal made for sharing" loading="lazy" /><span className="home-promo-burst">MADE<br />TO SHARE<span>✳</span></span></div>
            <span className="home-promo-doodle" aria-hidden="true">✳</span>
          </div>
        </section>

        <section className="home-section home-cream home-top-rated">
          <div className="home-container">
            <SectionHeading eyebrow="THE DISHES YOU LOVE MOST" title={<>A few of our <em>all-stars.</em></>} copy="Good things have a way of becoming regular orders." />
            <div className="home-rated-grid">
              {[
                { name: "Sunday best chicken", image: "/full chicken.avif", rating: "4.9", count: "128" },
                { name: "The double smash", image: "/chicken burger.avif", rating: "4.8", count: "96" },
                { name: "A slice of the good life", image: "/full pizza.jfif", rating: "5.0", count: "84" },
                { name: "Spicy rice, happy heart", image: "/chicken fried rice.avif", rating: "4.9", count: "72" },
              ].map((dish, index) => (
                <article className="home-rated-card reveal" key={dish.name} style={{ "--reveal-order": index }}>
                  <div><img src={dish.image} alt={dish.name} loading="lazy" /><span>★ {dish.rating} <small>({dish.count})</small></span></div>
                  <h3>{dish.name}</h3><a href="#menu" aria-label={`Explore ${dish.name}`}>Take a closer look <span aria-hidden="true">↗</span></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-section home-menu-section" id="menu">
          <div className="home-container">
            <SectionHeading eyebrow="A MENU FULL OF GOOD IDEAS" title={<>What sounds <em>good?</em></>} copy="Your table, your rules. Here are a few lovely places to start." light />
            <div className="home-menu-categories" aria-label="Menu categories"><span className="is-active">A little bit of everything</span><span>Something crispy</span><span>Handheld happiness</span><span>Made for sharing</span></div>
            <div className="home-menu-list">
              {menuItems.map(([name, description, price], index) => (
                <article className={`home-menu-item reveal${index === 0 ? " home-menu-item-featured" : ""}`} key={name} style={{ "--reveal-order": index }}>
                  <span className="home-menu-number">0{index + 1}</span><div><h3>{name}</h3><p>{description}</p></div><strong>{price}</strong><a href="/login" aria-label={`Sign in to order ${name}`}>↗</a>
                </article>
              ))}
            </div>
            <p className="home-menu-note">A little heads-up: our team can help with ingredient and allergy questions.</p>
          </div>
        </section>

        <section className="home-section home-cream" id="team">
          <div className="home-container">
            <SectionHeading eyebrow="THE PEOPLE BEHIND THE PLATES" title={<>Nice to meet <em>you.</em></>} copy="A small hello from the folks who make Restora feel like Restora." />
            <div className="home-team-grid">
              {team.map((person, index) => (
                <article className="home-team-card reveal" key={person.name} style={{ "--reveal-order": index }}>
                  <div className={`home-team-portrait team-${person.color}`}><span>{person.initials}</span><b aria-hidden="true">✳</b></div>
                  <div className="home-team-copy"><div><h3>{person.name}</h3><p>{person.role}</p></div><span aria-hidden="true">↗</span></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-combo" id="combos">
          <div className="home-container home-combo-inner">
            <div className="home-combo-copy reveal"><Eyebrow light>FOR YOU & YOUR FAVORITE PEOPLE</Eyebrow><h2>More to share.<br /><em>More to love.</em></h2><p>Our kind of math: a little of this, a little of that, and everyone gets a bite.</p><a className="home-button" href="#menu">Find your table’s combo <span aria-hidden="true">↗</span></a></div>
            <div className="home-combo-art reveal"><img src="/set menu.avif" alt="A Restora set meal ready to share" loading="lazy" /><span className="home-combo-badge">THE<br />HAPPY<br />TABLE <b>✳</b></span><span className="home-combo-chili" aria-hidden="true">✳</span></div>
          </div>
        </section>

        <section className="home-section home-testimonial-section">
          <div className="home-container home-testimonial">
            <div className="home-testimonial-copy reveal"><Eyebrow>DON’T JUST TAKE OUR WORD FOR IT</Eyebrow><div className="home-quote-mark">“</div><blockquote>Somehow, everyone found something they loved. We stayed way longer than we planned — and already picked a day to come back.</blockquote><div className="home-quote-person"><span className="home-quote-avatar">MR</span><span><strong>Morgan R.</strong><small>Local, regular, enthusiastic leftovers advocate</small></span><span className="home-quote-stars">★★★★★</span></div></div>
            <div className="home-testimonial-image reveal"><img src="/chicken leg with french fry.avif" alt="A delicious meal shared around the table" loading="lazy" /><span className="home-testimonial-stamp">GOOD FOOD<br />GOOD FEELING<br />✳</span></div>
          </div>
        </section>

        <section className="home-section home-white" id="journal">
          <div className="home-container">
            <SectionHeading eyebrow="LITTLE NOTES FROM OUR TABLE" title={<>Stories worth <em>savoring.</em></>} copy="A few things we’ve been cooking, thinking, and talking about lately." />
            <div className="home-stories-grid">
              {stories.map((story, index) => (
                <article className="home-story-card reveal" key={story.title} style={{ "--reveal-order": index }}>
                  <a href="#gallery" aria-label={`Read: ${story.title}`}><div className="home-story-image"><img src={story.image} alt="" loading="lazy" /></div><div className="home-story-meta"><span>{story.type}</span><span>{story.time}</span></div><h3>{story.title}</h3><span className="home-story-read">A little more <b aria-hidden="true">↗</b></span></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-gallery" id="gallery" aria-label="A look around the Restora table">
          {gallery.map((image, index) => <div className="home-gallery-image reveal" key={image.src} style={{ "--reveal-order": index }}><img src={image.src} alt={image.alt} loading="lazy" /></div>)}
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-container">
          <div className="home-footer-cta">
            <div><Eyebrow light>COME ON IN, THERE’S ROOM</Eyebrow><h2>Let’s make your<br /><em>next meal a good one.</em></h2></div>
            <Link className="home-button" href="/login">Find your way to Restora <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="home-footer-main">
            <div className="home-footer-brand"><Link className="home-logo home-logo-light" href="/"><span className="home-logo-mark" aria-hidden="true">r.</span><span>restora<span className="home-logo-dot">.</span></span></Link><p>A good meal is never just a meal.<br />It’s a little moment worth keeping.</p><div className="home-social-links"><a href="https://instagram.com" aria-label="Instagram">ig</a><a href="https://facebook.com" aria-label="Facebook">f</a><a href="https://tiktok.com" aria-label="TikTok">tk</a></div></div>
            <div className="home-footer-column"><h3>COME ON BY</h3><a href="#menu">Our menu</a><a href="#story">Our story</a><a href="#team">The people</a><a href="#journal">Little stories</a></div>
            <div className="home-footer-column"><h3>GOOD TO KNOW</h3><Link href="/login">Sign in</Link><Link href="/login">Create an account</Link><a href="#delivery">How it works</a><a href="#gallery">A look around</a></div>
            <div className="home-footer-newsletter"><h3>A LITTLE NOTE FROM US</h3><p>Good food news, now and then. Never spam, always delicious.</p><Link className="home-footer-join" href="/login">Join the Restora table <span aria-hidden="true">↗</span></Link><small>Create your Restora account to stay close to the good stuff.</small></div>
          </div>
          <div className="home-footer-bottom"><span>© {new Date().getFullYear()} Restora. Made with a little extra love.</span><div><a href="#top">Back to top ↑</a><a href="/login">Log in</a></div></div>
        </div>
        <span className="home-footer-decoration" aria-hidden="true">✳</span>
      </footer>
    </div>
  );
}
