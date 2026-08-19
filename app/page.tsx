"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import homePc from "@/assets/home-pc.png";
import homeMobile from "@/assets/home-mobile.png";

import clock from "@/assets/year.jpg";

import memoriesImage from "@/assets/memories.png";
import herImage from "@/assets/her.jpg";
import hisImage from "@/assets/him.jpg";
import foodImage from "@/assets/food.jpg";
import wardrobeImage from "@/assets/wardrobe.jpg";
import hairImage from "@/assets/hair.jpg";
import accessoriesImage from "@/assets/accessories.jpg";
import homeImage from "@/assets/home.jpg";
import songsImage from "@/assets/songs.jpg";
import dancesImage from "@/assets/dances.jpg";
import placesImage from "@/assets/places.jpg";
import photographyImage from "@/assets/photography.jpg";
import honeymoonImage from "@/assets/honeymoon.jpg";
import forHerImage from "@/assets/for-her.jpg";

const rooms = [
  {
    icon: "♡",
    name: "Our Memories",
    href: "/memories",
    image: memoriesImage,
  },
  {
    icon: "▣",
    name: "Her",
    href: "/her",
    image: herImage,
  },
  {
    icon: "▣",
    name: "Him",
    href: "/him",
    image: hisImage,
  },
  {
    icon: "♧",
    name: "Food",
    href: "/collection/food",
    image: foodImage,
  },
  {
    icon: "♢",
    name: "Her Wardrobe",
    href: "/collection/her_wardrobe",
    image: wardrobeImage,
  },
  {
    icon: "✂",
    name: "Hair",
    href: "/collection/hair",
    image: hairImage,
  },
  {
    icon: "◯",
    name: "Accessories",
    href: "/collection/accessories",
    image: accessoriesImage,
  },
  {
    icon: "⌂",
    name: "Our Home",
    href: "/collection/home",
    image: homeImage,
  },
  {
    icon: "♫",
    name: "Songs",
    href: "/collection/songs",
    image: songsImage,
  },
  {
    icon: "♢",
    name: "Dances",
    href: "/collection/dances",
    image: dancesImage,
  },
  {
    icon: "◎",
    name: "Places",
    href: "/collection/places",
    image: placesImage,
  },
  {
    icon: "▣",
    name: "Photography",
    href: "/collection/photography",
    image: photographyImage,
  },
  {
    icon: "♧",
    name: "Honeymoon",
    href: "/collection/honeymoon",
    image: honeymoonImage,
  },
  {
    icon: "✉",
    name: "For Her",
    href: "/forher",
    image: forHerImage,
    wide: true,
  },
];

export default function HomePage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [todayDate, setTodayDate] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.replace("/login");
        return;
      }

      if (mounted) {
        setTodayDate(new Date());
        setAuthenticated(true);
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  if (authenticated === null || todayDate === null) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#28211d]">
        <div className="text-center text-white/70">
          <div className="mb-4 font-serif text-3xl">
            ♡
          </div>

          <p className="text-[9px] uppercase tracking-[0.3em]">
            Opening our home...
          </p>
        </div>
      </main>
    );
  }

  const formattedToday = todayDate.toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
    }
  );

  return (
    <main className="site-root page-fade bg-[#f4f0ea] text-[#28231f]">

      {/* ================================================================ */}
      {/* HERO                                                            */}
      {/* ================================================================ */}

      <section className="hero">

        <Image
          src={homePc}
          alt="Our home"
          fill
          priority
          sizes="100vw"
          className="hero-background hidden md:block"
        />

        <Image
          src={homeMobile}
          alt="Our home"
          fill
          priority
          sizes="100vw"
          className="hero-background block md:hidden"
        />

        <div className="hero-overlay" />

        <div className="hero-content">

          <p className="hero-eyebrow">
            Our little corner of the internet
          </p>

          <h1 className="hero-title">
            Our Home
          </h1>

          <div className="hero-heart">
            ♡
          </div>

        </div>

        <a
          href="#today"
          className="hero-enter"
        >
          <span>
            Enter
          </span>

          <span className="hero-enter-line" />

          <span className="hero-enter-arrow">
            ⌄
          </span>
        </a>

      </section>

      {/* ================================================================ */}
      {/* TODAY                                                            */}
      {/* ================================================================ */}

      <section
        id="today"
        className="today-section"
      >
        <div className="page-container">

          <div className="today-grid">

            <div>

              <p className="today-label">
                Today
              </p>

              <h2 className="today-date">
                {formattedToday}
              </h2>

              <p className="today-description">
                Some days are ordinary.
                <br />
                Some days become memories.
              </p>

              <a
                href="/today"
                className="today-link"
              >
                <span>
                  On this day
                </span>

                <span>
                  →
                </span>
              </a>

            </div>

            <a
              href="/today"
              className="memory-card group"
            >

              <div className="memory-content">

                <p className="memory-eyebrow">
                  On this day
                </p>

                <h3 className="memory-title">
                  Memories from
                  <br />
                  years gone by
                </h3>

                <p className="memory-dates">
                  {formattedToday} · Previous years · Same day
                </p>

              </div>

              <div className="memory-image">

                <Image
                  src={clock}
                  alt="Our memories"
                  fill
                  sizes="(max-width: 768px) 100vw, 42vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />

              </div>

            </a>

          </div>

        </div>

      </section>

      {/* ================================================================ */}
      {/* ROOMS                                                            */}
      {/* ================================================================ */}

      <section
        id="rooms"
        className="rooms-section"
      >
        <div className="page-container">

          <div className="rooms-header">

            <p className="section-eyebrow">
              Explore our rooms
            </p>

            <div className="rooms-header-line" />

          </div>

          <div className="rooms-grid">

            {rooms.map((room) => (
              <a
                key={room.href}
                href={room.href}
                className={`room-card group ${
                  room.wide
                    ? "room-card-wide"
                    : ""
                }`}
              >

                <Image
                  src={room.image}
                  alt={room.name}
                  fill
                  sizes="
                    (max-width: 768px) 50vw,
                    (max-width: 1100px) 25vw,
                    16vw
                  "
                  className="room-card-image"
                />

                <div className="room-card-content">

                  <span className="room-card-icon">
                    {room.icon}
                  </span>

                  <span className="room-card-title">
                    {room.name}
                  </span>

                </div>

              </a>
            ))}

          </div>

        </div>

      </section>

      {/* ================================================================ */}
      {/* QUOTE                                                            */}
      {/* ================================================================ */}

      <section className="quote-section">

        <div className="page-container">

          <div className="section-divider mb-14" />

          <div className="quote-mark">
            “
          </div>

          <p className="quote-text">
            “A little place for everything we love.”
          </p>

          <div className="quote-line" />

          <p className="quote-caption">
            Just ours ♡
          </p>

        </div>

      </section>

    </main>
  );
}
