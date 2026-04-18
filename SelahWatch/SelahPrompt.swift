// SelahWatch/SelahPrompt.swift
//
// All 20 faith verses + secular prompts.
// Shared data model used across all Watch screens.

import Foundation

struct BreathePhrases {
    let inhale: String
    let hold:   String
    let exhale: String
}

struct SelahPrompt: Identifiable, Equatable {
    let id      = UUID()
    let source:  String
    let closing: String
    let breathe: BreathePhrases

    static func == (lhs: SelahPrompt, rhs: SelahPrompt) -> Bool {
        lhs.id == rhs.id
    }

    static func random(secular: Bool) -> SelahPrompt {
        let list = secular ? secularPrompts : faithPrompts
        return list.randomElement() ?? faithPrompts[0]
    }
}

// ── Faith Prompts — 20 Verses ─────────────────────────────────────────────────
let faithPrompts: [SelahPrompt] = [
    SelahPrompt(source: "Psalm 46:10",        closing: "God is GOD",                              breathe: BreathePhrases(inhale: "I am still",               hold: "I know",                 exhale: "You are GOD")),
    SelahPrompt(source: "Isaiah 26:3",        closing: "God's peace is yours",                    breathe: BreathePhrases(inhale: "I return to you",          hold: "I trust you",            exhale: "I am safe with you")),
    SelahPrompt(source: "Philippians 4:7",    closing: "God is guarding your heart and mind",     breathe: BreathePhrases(inhale: "Your peace surrounds me",  hold: "You are with me",        exhale: "I am safe… I can rest.")),
    SelahPrompt(source: "John 16:33",         closing: "Jesus has overcome",                      breathe: BreathePhrases(inhale: "I turn my eyes to you",    hold: "You have overcome",      exhale: "You are my peace")),
    SelahPrompt(source: "Psalm 23:4",         closing: "God is with you",                         breathe: BreathePhrases(inhale: "I am not alone",           hold: "I will not fear",        exhale: "You are with me")),
    SelahPrompt(source: "Isaiah 41:10",       closing: "The Lord is with you. You are not alone", breathe: BreathePhrases(inhale: "You are with me",          hold: "You are my strength",    exhale: "I am held")),
    SelahPrompt(source: "Deuteronomy 31:6",   closing: "The Lord will never fail you",            breathe: BreathePhrases(inhale: "You go before",            hold: "You are dependable",     exhale: "You are faithful")),
    SelahPrompt(source: "Psalm 91:15",        closing: "God is with you",                         breathe: BreathePhrases(inhale: "You hear me",              hold: "You are with me",        exhale: "I am not alone")),
    SelahPrompt(source: "Proverbs 3:5–6",     closing: "Trust in the Lord",                       breathe: BreathePhrases(inhale: "I trust you",              hold: "You are leading me",     exhale: "It will be okay")),
    SelahPrompt(source: "1 Peter 5:7",        closing: "The Lord cares about you",                breathe: BreathePhrases(inhale: "You see me",               hold: "You know me",            exhale: "You care about me")),
    SelahPrompt(source: "Jeremiah 17:7",      closing: "The Lord is holding you",                 breathe: BreathePhrases(inhale: "My trust is in you",       hold: "You are my hope",        exhale: "I am held")),
    SelahPrompt(source: "2 Corinthians 12:9", closing: "God's grace is enough for you",           breathe: BreathePhrases(inhale: "You are strong",           hold: "Your strength carries me", exhale: "Your grace is enough")),
    SelahPrompt(source: "Jeremiah 29:11",     closing: "God's plans for you are good",            breathe: BreathePhrases(inhale: "You know everything about me", hold: "You hold my future", exhale: "I can trust you")),
    SelahPrompt(source: "Isaiah 40:31",       closing: "The Lord renews your strength",           breathe: BreathePhrases(inhale: "You are my hope",          hold: "You renew my strength",  exhale: "I will not grow weary")),
    SelahPrompt(source: "Isaiah 43:2–3",      closing: "God is with you. Always.",                breathe: BreathePhrases(inhale: "You are with me",          hold: "You cover me",           exhale: "I am not alone")),
    SelahPrompt(source: "Psalm 42:11",        closing: "The Lord is your hope",                   breathe: BreathePhrases(inhale: "You are my hope",          hold: "You are my God",         exhale: "I trust you")),
    SelahPrompt(source: "Psalm 139:17",       closing: "God's thoughts are full of you",          breathe: BreathePhrases(inhale: "You think of me",          hold: "You care for me",        exhale: "I am precious to You")),
    SelahPrompt(source: "Psalm 62:6",         closing: "The Lord is your refuge",                 breathe: BreathePhrases(inhale: "You are my rock",          hold: "You are my fortress",    exhale: "I am safe with You")),
    SelahPrompt(source: "Psalm 94:19",        closing: "The Lord fills you with His joy",         breathe: BreathePhrases(inhale: "You comfort me",           hold: "You steady me",          exhale: "Your joy fills my heart")),
    SelahPrompt(source: "Jeremiah 33:3",      closing: "The Lord hears you",                      breathe: BreathePhrases(inhale: "You hear me",              hold: "You answer me",          exhale: "I can call on you")),
]

// ── Secular Prompts ───────────────────────────────────────────────────────────
let secularPrompts: [SelahPrompt] = [
    SelahPrompt(source: "Mindfulness",   closing: "Carry this calm forward",       breathe: BreathePhrases(inhale: "I am calm",    hold: "I am present",  exhale: "I release tension")),
    SelahPrompt(source: "Affirmation",   closing: "This moment is enough",         breathe: BreathePhrases(inhale: "I breathe in", hold: "stillness",     exhale: "I let go")),
    SelahPrompt(source: "Reflection",    closing: "You are grounded",              breathe: BreathePhrases(inhale: "I am here",    hold: "right now",     exhale: "That is enough")),
    SelahPrompt(source: "Mindfulness",   closing: "Return to this breath anytime", breathe: BreathePhrases(inhale: "I anchor",     hold: "to now",        exhale: "I am grounded")),
    SelahPrompt(source: "Viktor Frankl", closing: "You chose stillness",           breathe: BreathePhrases(inhale: "I pause",      hold: "I choose",      exhale: "I respond")),
    SelahPrompt(source: "Dan Millman",   closing: "Thoughts pass. You remain.",    breathe: BreathePhrases(inhale: "I observe",    hold: "with calm",     exhale: "Thoughts pass")),
]
