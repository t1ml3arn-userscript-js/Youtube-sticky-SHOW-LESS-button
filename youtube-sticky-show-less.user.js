/* 
	Youtube sticky Show Less button: Makes SHOW LESS button to be "sticky" 
	to the video description section, so you can easily fold a long description 
	without scrolling it all the way to its bottom.
	Copyright (C) 2023  T1mL3arn

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	You should have received a copy of the GNU General Public License
	along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

// ==UserScript==
// @name        Youtube sticky Show Less button
// @description Makes SHOW LESS button to be "sticky" to the video description section, so you can easily fold a long description without scrolling it all the way to its bottom.
// @description:RU Делает кнопку СВЕРНУТЬ в описании видео "липкой". Чтобы свернуть длинное описание теперь не нужно прокручивать это описание в самый низ.
// @namespace   https://github.com/t1ml3arn-userscript-js
// @version     1.2.0
// @match				https://www.youtube.com/*
// @match       https://youtube.com/*
// @noframes
// @grant       none
// @author      T1mL3arn
// @homepageURL	https://github.com/t1ml3arn-userscript-js/Youtube-sticky-SHOW-LESS-button
// @supportURL	https://github.com/t1ml3arn-userscript-js/Youtube-sticky-SHOW-LESS-button/issues
// @license			GPL-3.0-only
// ==/UserScript==


const SHOWLESS_BTN_WRAP_CLS = 'sticky-show-less-btn-wrap';
const STICKY_STYLE_ELT_ID = 'sticky-states-css'

const STICKY_STYLESHEET_CONTENT = `

#description-inline-expander {
	/* 
	To make stickiness work I have to set "overflow: visible" on this element.
	Without this SHOW LESS button sticks with wrong way and does not work as intended.

	Sticky elt sticks to its nearest ancestor that has a "scrolling mechanism"
	(created when overflow is hidden, scroll, auto, or overlay)
	So, disabling "show less" button parent's "scrolling mechanism"
	it is possible to make it work as expected.

	Still, I neither know nor understand how this shit works.

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
	z-index: 999;
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

tp-yt-paper-button#collapse {
	pointer-events: initial;
	padding: 6px 16px;
	background: darkseagreen;
	color: white;
	margin-top: 0;
}
`;

let SETTINGS = {
	videoDescriptionSelector: 'ytd-video-secondary-info-renderer',
	videoTitleSelector: 'div#info.ytd-watch-flexy',
}

function addCss(css, id) {
	const style = document.head.appendChild(document.createElement('style'))
	style.textContent = css;
	style.id = id;
}

function getVisibleElt(selector) {
	return Array.from(document.querySelectorAll(selector)).find(e => e.offsetParent != null)
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
	const commentsTop = getVisibleElt('ytd-comments').getBoundingClientRect().top

	return commentsTop < vpHeight;
}

function preserveCommentsOnScreen() {
	const descriptionElt = document.querySelector(SETTINGS.videoDescriptionSelector)
	// scrollOffset must not be negative!
	const scrollOffset = Math.abs(descriptionElt.getBoundingClientRect().height - descriptionHeight)
	let { scrollX, scrollY } = window;
	
	console.debug('preserve comments:', scrollY, scrollOffset, scrollY - scrollOffset)

	scrollY = scrollY - scrollOffset;
	window.scrollTo(scrollX, scrollY)
}

function isDescriptionTopEdgeOutView() {
	const descriptionElt = document.querySelector(SETTINGS.videoTitleSelector);

	return descriptionElt.getBoundingClientRect().top < 0
}

function scrollDescriptionIntoView() {
	console.debug('scroll description into view')
	document.querySelector(SETTINGS.videoTitleSelector).scrollIntoView({ behavior: 'smooth' })
}

let descriptionHeight;

function saveDescriptionHeight() {
	// saving initial description elt height (it is needed to fix scroll position)
	const descriptionElt = document.querySelector(SETTINGS.videoDescriptionSelector)
	descriptionHeight = descriptionElt.getBoundingClientRect().height;

	// at saveDescriptionHeight() call height might be not actual,
	// and delaying the reading helps
	setTimeout(() => {
		console.debug('timeout')
		var h = document.querySelector(SETTINGS.videoDescriptionSelector).getBoundingClientRect().height
		console.debug(h)
		descriptionHeight = h
	}, 0);
}

function enchanceShowLessButton() {
	// youtube SHOW LESS button
	const showLessBtn = document.querySelector('tp-yt-paper-button#collapse')
	const showLessParent = showLessBtn.parentElement

	// I use wrap to intercept clicks in CAPTURE phase
	// to calcalute scroll offset BEFORE youtube hides the description
	const btnWrap = document.createElement('div')
	btnWrap.appendChild(showLessBtn)
	btnWrap.addEventListener('click', fixScroll, true)

	const stickyWrap = document.createElement('div');
	stickyWrap.classList.add(SHOWLESS_BTN_WRAP_CLS)
	stickyWrap.appendChild(btnWrap);

	// add sticky wrapper (with showless button) to video description element
	showLessParent.appendChild(stickyWrap)
}

function init() {	

	addCss(STICKY_STYLESHEET_CONTENT, STICKY_STYLE_ELT_ID)

	SETTINGS = {
		videoDescriptionSelector: '#above-the-fold.ytd-watch-metadata',
		videoTitleSelector: '#above-the-fold.ytd-watch-metadata',
	}

	// Looks like 'yt-page-data-updated' is the event I need to listen
	// to know exactly when youtube markup is ready to be queried.
	document.addEventListener('yt-page-data-updated', _ => {
		// Script should work only for pages with a video,
		// such pages have url like https://www.youtube.com/watch?v=25YbRHAc_h4
		if (window.location.search.includes('v=')) {
			saveDescriptionHeight()
			enchanceShowLessButton()
		}
	})
}

init()