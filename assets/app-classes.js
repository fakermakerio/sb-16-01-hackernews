class HackOrSnoozeApp {
	constructor() {
		
		// JQUERY CACHES
		// Misc.
		this.$articlesList = $("#articles-list");
		this.$app = $("#app");
		this.$navUserProfile = $("#nav-user-profile");
		this.$emptyMessage = $("#empty-message-container");
		// Navigation
		this.$mainNav = $("#main-nav");
		// Sections
		this.$allSections = $(".app-section");
		this.$accountSection = $("#account-section");
		this.$articlesSection = $("#articles-section");
		this.$editArticleSection = $("#edit-article-section");
		this.$submitArticleSection = $("#submit-article-section");
		// jQuery caches: forms
		this.$createAccountForm = $("#create-account-form");
		this.$editArticleForm = $("#edit-article-form");
		this.$loginForm = $("#login-form");
		this.$submitForm = $("#submit-form");

		// global storyList variable
		this.storyMap = null;

		// global currentUser variable
		this.currentUser = null;
		
		// Keep track of current nav item for showing appropriate data
		this.currentContent = null;

		this.init();
	}

	async init() {
		this.addEventListeners();
		await this.checkIfLoggedIn();
		await this.showAllArticles();

		this.generateRandomDebugContent();
	}

	/**
	 * Pre-fills forms with dummy content and user login for easier debugging/testing
	 */
	generateRandomDebugContent() {
		$("#submit-author").val(faker.name.findName());
		$("#submit-title").val(faker.hacker.phrase());
		$("#submit-url").val(faker.internet.url());
		
		$("#login-username").val("test123");
		$("#login-password").val("test123");
	}

	/**
	 * Add listeners to form and UI elements
	 */
	addEventListeners() {
		// Login form submission
		this.$loginForm.on("submit", async (event) => this.handleLoginFormSubmit(event));
		// Create account form submission
		this.$createAccountForm.on("submit", async (event) => this.handleCreateAccountFormSubmit(event));
		// Article submission form
		this.$submitForm.on("submit", async (event) => this.handleSubmitArticleFormSubmit(event));
		// Main nav click
		this.$mainNav.on("click", ".nav-link", async (event) => this.handleNavigationClick(event));
		// Article click
		this.$articlesList.on("click", ".article-action", async (event) => this.handleArticleActionClick(event));
	}

	/**
	 * Handles clicks within the article actions buttons
	 * @param {*} event  jQuery Mouse event
	 */
	async handleArticleActionClick(event) {

		// TODO: Find a better way of getting this ref
		const articleItem = event.target.parentNode.parentNode.parentNode;
		const id = articleItem.id;

		// Delete button
		if (event.target.classList.contains('delete')) {
			try {
				let response = await StoryMap.deleteStory(this.currentUser, id);
				// Remove from DOM
				$(articleItem).remove();
			} catch (error) {
				console.error(error);
			}
		}
		// "Not favorite" is the unfilled star, so favorite it
		if (event.target.classList.contains('not-favorite')) {
			let response = await this.currentUser.addFavorite(id);
			this.refreshArticles();
		}
		// "Favorite" means the star is filled, so unfavorite it
		if (event.target.classList.contains('favorite')) {
			try {
				let response = await this.currentUser.deleteFavorite(id);
				this.refreshArticles();
				// if ( this.currentContent === 'favorite-articles') {
				// 	console.log( $(`#${id}`).remove() );
				// }
			} catch ( error ) {
				console.error(error);
			}
		}
	}

	/**
	 * Handles user submitting the login form
	 * @param {*} event 
	 */
	async handleLoginFormSubmit(event) {
		event.preventDefault(); // no page refresh
		let username = $("#login-username").val();
		let password = $("#login-password").val();
		await this.login(username, password);
	}

	async handleCreateAccountFormSubmit(event) {
		event.preventDefault();

		// grab the required fields
		let name = $("#create-account-name").val();
		let username = $("#create-account-username").val();
		let password = $("#create-account-password").val();

		this.createAccount(username, password, name);
	}

	async handleSubmitArticleFormSubmit(event) {
		event.preventDefault();

		const author = $("#submit-author").val();
		const title = $("#submit-title").val();
		const url = $("#submit-url").val();

		const newStory = new Story({ author, title, url });

		await StoryMap.addStory(this.currentUser, newStory);

		this.showAllArticles();
	}

	/**
	 * Event Handler for Clicking main nav links
	 */
	async handleNavigationClick(event) {

		event.preventDefault();

		switch (event.target.id) {
			case "nav-all":
				this.showAllArticles();
				break;
			case "nav-submit":
				this.showSubmit();
				break;
			case "nav-favorites":
				this.showFavoriteArticles();
				break;
			case "nav-my-stories":
				this.showMyArticles();
				break;
			case "nav-login":
			case "nav-user-profile":
				this.showAccount();
				break;
			case "nav-logout":
				this.logout();
				this.showAllArticles();
				break;
		}
	};

	async refreshArticles() {
		this.generateStories(this.storyMap);
	}

	/**
	 * Shows the All Articles view (default)
	 */
	async showAllArticles() {
		// Refresh stories from API
		let storyMap = await StoryMap.getStories();
		this.generateStories(storyMap.storyMap);
		this.showSection(this.$articlesSection, 'all-articles');
	}
	/**
	 * Shows the "My Stories" view (user's submitted articles)
	 */
	async showMyArticles() {
		this.generateStories(this.currentUser.ownStoryMap);
		this.showSection(this.$articlesSection, 'my-articles');
	}
	/**
	 * Shows user's Favorites articles view
	 */
	async showFavoriteArticles() {
		this.generateStories(this.currentUser.favoritesMap);
		this.showSection(this.$articlesSection, 'favorite-articles');
	}
	/**
	 * Shows the submit (create article) view
	 */
	async showSubmit() {
		this.generateRandomDebugContent();
		this.showSection(this.$submitArticleSection, 'submit');
	}
	/**
	 * Shows Users account view view (login/edit account) 
	 */
	async showAccount() {
		this.showSection(this.$accountSection, 'account');
	}
	/**
	 * Shows the specified section view
	 * @param {jQuery} section  jQuery object for section element
	 * @param {string} contentId  String id
	 */
	showSection(section, contentId) {
		this.currentContent = contentId;

		// Hide all sections
		this.$allSections.hide();
		// Show new section
		section.show();

		// Add current content to app data so we can use CSS to toggle properties within the section
		// TODO: This feels weird...
		this.$app.attr('data-content', contentId);
	}

	/**
	 * On page load, checks local storage to see if the user is already logged in.
	 * Renders page information accordingly.
	 */
	async checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem("token");
		const username = localStorage.getItem("username");

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		this.currentUser = await User.getLoggedInUser(token, username);

		if (this.currentUser) {
			this.showLoggedInState();
		}
	}

	/**
	 * Update view with logged in state
	 */
	showLoggedInState() {
		let formattedDate = moment( this.currentUser.createdAt ).calendar();

		$("#profile-name").text(`Name: ${this.currentUser.name}`);
		$("#profile-username").text(`Username: ${this.currentUser.username}`);
		$("#profile-account-date").text(`Account Created: ${formattedDate}`);

		this.$navUserProfile.text(this.currentUser.username);
		this.$app.addClass('authenticated');
	}

	/**
	 * Create a new user account
	 * @param {string} username User's username
	 * @param {string} password User's password
	 * @param {string} name User's full name
	 */
	async createAccount(username, password, name) {
		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		this.currentUser = newUser;
		this.syncCurrentUserToLocalStorage();
		this.loginAndSubmitForm();
	}

	/**
	 * Logs in the user
	 * @param {string} username  User's username
	 * @param {string} password  User's password
	 */
	async login(username, password) {
		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		this.currentUser = userInstance;
		this.syncCurrentUserToLocalStorage();
		this.loginAndSubmitForm();
	}

	/**
	 * A rendering function to run to reset the forms and hide the login info
	 */
	loginAndSubmitForm() {

		this.showLoggedInState();

		// Reset Forms
		this.$loginForm.trigger("reset");
		this.$createAccountForm.trigger("reset");

		// show the stories
		this.showAllArticles();
	}

	/**
	 * Logs out the current user
	 */
	logout() {
		// Clear current user
		this.currentUser = null;
		// empty out local storage
		localStorage.clear();
		// Update UI
		this.$app.removeClass('authenticated');
	}

	/**
	 * Sync current user information to localStorage
	 */
	syncCurrentUserToLocalStorage() {
		if (this.currentUser) {
			localStorage.setItem("token", this.currentUser.loginToken);
			localStorage.setItem("username", this.currentUser.username);
		}
	}

	/**
	 * A rendering function to call the StoryList.getStories static method,
	 *  which will generate a storyListInstance. Then render it.
	 */
	generateStories(storyMap) {
		// Store map for later refreshing
		// TODO: do this more elegantly
		this.storyMap = storyMap;

		// empty out that part of the page
		this.$articlesList.empty();

		// Check for empty contents
		if (storyMap.size == 0) {
			this.$emptyMessage.show();
		} else {
			this.$emptyMessage.hide();
			// loop through all of our stories and generate HTML for them
			for (let story of storyMap.values()) {
				const result = this.generateStoryHTML(story);
				this.$articlesList.append(result);
			}
		}
	}

	/**
	 * A function to render HTML for an individual Story instance
	 */
	generateStoryHTML(story) {
		let hostName = Utils.getHostName(story.url);

		let favoriteIcon = "";
		if (this.currentUser != null) {
			if (this.currentUser.favoritesMap.has(story.storyId)) {
				favoriteIcon = '<div class="favorite article-action"><i class="fa fa-star"></i></div>';
			} else {
				favoriteIcon = '<div class="not-favorite article-action"><i class="far fa-star"></i></div>';
			}
		}

		// render story markup
		const storyMarkup = $(`
			<li id="${story.storyId}">
				<div class="article-container">
					<div class="article-actions">
						${favoriteIcon}
						<div class="delete article-action">
							<i class="far fa-trash-alt"></i>
						</div>
					</div>
					<div class="article-content">
						<a class="article-link" href="${story.url}" target="a_blank">${story.title}</a>
						<small class="article-author">by ${story.author}</small>
						<small class="article-hostname ${hostName}">(${hostName})</small>
						<small class="article-username">posted by ${story.username}</small>
					</div>
				</div>
			</li>
		`);

		return storyMarkup;
	}
}

class Utils {
	/**
	 * Simple function to pull the hostname from a URL
	 * 
	 * @param  {string}   url   URL to extract hostname from
	 */
	static getHostName(url) {
		let hostName;
		if (url.indexOf("://") > -1) {
			hostName = url.split("/")[2];
		} else {
			hostName = url.split("/")[0];
		}
		if (hostName.slice(0, 4) === "www.") {
			hostName = hostName.slice(4);
		}
		return hostName;
	}
}

