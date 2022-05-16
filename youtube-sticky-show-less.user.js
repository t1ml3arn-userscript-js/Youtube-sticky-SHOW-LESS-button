// ==UserScript==
// @name        Youtube sticky Show Less
// @description Makes SHOW LESS button to be "sticky" to the video description section, so you can easily fold a long description without scrolling the page.
// @namespace   My Scripts
// @version     1.0.0
// @match				https://www.youtube.com/*
// @match       https://youtube.com/*
// @grant       none
// @author      T1mL3arn
// @license			GPLv3
// ==/UserScript==


const SHOWLESS_BTN_WRAP_CLS = 'sticky-show-less-btn-wrap';

const STICKY_STYLE_ELT_ID = 'sticky-states-css'
const STICKY_STYLESHEET_CONTENT = `

ytd-page-manager {
	/* 
	To make stickiness work I have to set "overflow: visible" on this element.
	Without this SHOW LESS button sticks with wrong way and does not work as intended.
	See more:
		- https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky
		- https://uxdesign.cc/position-stuck-96c9f55d9526#b2ca
	*/
	overflow: visible !important;
}

.${SHOWLESS_BTN_WRAP_CLS} {
	position: sticky;
	bottom: 50px;
	text-align: right;
	bottom: 50%;
	pointer-events: none;
}

ytd-video-secondary-info-renderer tp-yt-paper-button#less.ytd-expander {
	pointer-events: initial;
	padding: 6px 16px;
	background: darkseagreen;
}

ytd-video-secondary-info-renderer tp-yt-paper-button#less.ytd-expander > .less-button {
	color: white;
	margin-top: 0;
}

`;

function addCss(css, id) {
	const style = document.head.appendChild(document.createElement('style'))
	style.textContent = css;
	style.id = id;
}

function waitElement(selector, timeout=10000, freq = 500) {
	const elt = document.querySelector(selector)
	if (elt)	
		return Promise.resolve(elt)
	else 
		return new Promise((resolve, reject) => {

			let intervalId, timeoutId;

			intervalId = setInterval(() => {
				const elt = document.querySelector(selector)
				if (elt) {
					clearInterval(intervalId)
					clearTimeout(timeoutId)
					resolve(elt)
				}
			}, freq);

			timeoutId = setTimeout(() => {
				clearInterval(intervalId)
				reject(`Cannot find element "${selector}" (timeout ${timeout})`)
			}, timeout);
		})
}

function fixScroll() {
	
	if (areCommentsVisible())
		preserveCommentsOnScreen()
	else if (isDescriptionTopEdgeOutView())
		scrollDescriptionIntoView();
	else {
		console.debug('do nothing with scroll')
	}
}

function areCommentsVisible() {
	const vpHeight = window.visualViewport.height
	const commentsTop = document.querySelector('ytd-comments').getBoundingClientRect().top

	return commentsTop < vpHeight;
}

function preserveCommentsOnScreen() {
	const descriptionElt = document.querySelector('ytd-video-secondary-info-renderer')
	// scrollOffset must not be zero!
	const scrollOffset = Math.abs(descriptionElt.getBoundingClientRect().height - descriptionHeight)
	const { scrollX, scrollY } = window;

	console.debug('preserve comments:', scrollY, scrollOffset, scrollY - scrollOffset)

	requestAnimationFrame(() => {
		window.scrollTo(scrollX, scrollY - scrollOffset)
	})
}

function isDescriptionTopEdgeOutView() {
	const descriptionElt = document.querySelector('div#info-contents').parentElement;

	return descriptionElt.getBoundingClientRect().top < 0
}

function scrollDescriptionIntoView() {
	console.debug('scroll description into view')
	document.querySelector('div#info-contents').parentElement.scrollIntoView({ behavior: 'smooth' })
}

let descriptionHeight;

async function init() {	

	addCss(STICKY_STYLESHEET_CONTENT, STICKY_STYLE_ELT_ID)

	// saving initial description elt height (it is needed to fix scroll position)
	const descriptionElt = await waitElement('ytd-video-secondary-info-renderer')
	descriptionHeight = descriptionElt.getBoundingClientRect().height;

	// youtube SHOW LESS button
	const showLessBtn = (await waitElement('tp-yt-paper-button#less > yt-formatted-string.ytd-video-secondary-info-renderer')).parentElement

	// I use wrap to intercept clicks in CAPTURE phase
	// to calcalute scroll offset BEFORE youtube hides the description
	const btnWrap = document.createElement('div')
	btnWrap.appendChild(showLessBtn)
	btnWrap.addEventListener('click', fixScroll, true)

	const stickyWrap = document.createElement('div');
	stickyWrap.classList.add(SHOWLESS_BTN_WRAP_CLS)
	stickyWrap.appendChild(btnWrap);		// NOTE ; at the end, because of the next (await ...) command
	
	// add sticky wrapper (with showless button) to video description element
	(await waitElement('ytd-expander')).appendChild(stickyWrap);
}

init()