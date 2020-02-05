const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryMap {
	constructor(stories) {
		this.storyMap = new Map( stories.map( (s) => { return [ s.storyId , s ] } ));
	}

	/**
	 * This method is designed to be called to generate a new StoryMap.
	 *  It:
	 *  - calls the API
	 *  - builds an array of Story instances
	 *  - makes a single StoryMap instance out of that
	 *  - returns the StoryMap instance.*
	 */

	static async getStories() {
		// query the /stories endpoint (no auth required)
		const response = await axios.get(`${BASE_URL}/stories`);

		// turn the plain old story objects from the API into instances of the Story class
		const stories = response.data.stories.map(story => new Story(story));

		// build an instance of our own class using the new array of stories
		const storyMap = new StoryMap(stories);
		return storyMap;
	}

	/**
	 * Method to make a POST request to /stories and add the new story to the list
	 * - user - the current instance of User who will post the story
	 * - newStory - a new story object for the API with title, author, and url
	 *
	 * Returns the new story object
	 */
	static async addStory(user, newStory) {

		const { author, title, url } = newStory;

		const response = await axios.post(`${BASE_URL}/stories`, {
			token: user.loginToken,
			story: newStory
		});

		return new Story(response.data.story);
	}

	/**
	 * Deletes a user's story.
	 * @param  user      User object
	 * @param  storyId   Story Id to remove
	 */
	static async deleteStory(user, storyId) {
		const response = await axios.delete(`${BASE_URL}/stories/${storyId}`, {
			params: {
				token: user.loginToken
			}
		});
	}
}


/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
	constructor(userObj) {
		this.username = userObj.username;
		this.name = userObj.name;
		this.createdAt = userObj.createdAt;
		this.updatedAt = userObj.updatedAt;

		// these are all set to defaults, not passed in by the constructor
		this.loginToken = "";
		this.favoritesMap = new Map();
		this.ownStoryMap = new Map();
	}

	/* Create and return a new user.
	 *
	 * Makes POST request to API and returns newly-created user.
	 *
	 * - username: a new username
	 * - password: a new password
	 * - name: the user's full name
	 */

	static async create(username, password, name) {
		const response = await axios.post(`${BASE_URL}/signup`, {
			user: {
				username,
				password,
				name
			}
		});

		// build a new User instance from the API response
		const newUser = new User(response.data.user);

		// attach the token to the newUser instance for convenience
		newUser.loginToken = response.data.token;

		return newUser;
	}

	/* Login in user and return user instance.
  
	 * - username: an existing user's username
	 * - password: an existing user's password
	 */

	static async login(username, password) {
		const response = await axios.post(`${BASE_URL}/login`, {
			user: {
				username,
				password
			}
		});

		return User.getUserFromResponse(response);
	}


	static getUserFromResponse(response) {
		let user = new User(response.data.user);

		// instantiate Story instances for the user's favorites and ownStoryMap
		user.favoritesMap = new Map(response.data.user.favorites.map(s => { 
			return [s.storyId, new Story(s)] 
		}));
		user.ownStoryMap = new Map(response.data.user.stories.map(s => { 
			return [s.storyId, new Story(s)] 
		}));

		// attach the token to the newUser instance for convenience
		user.loginToken = response.data.token;

		return user;
	}

	/**
	 * Adds the specified story ID as a user favorite
	 * @param  storyId Story ID
	 */
	async addFavorite(storyId) {
		if (!this.loginToken || !storyId) return null;

		// call the API
		const response = await axios.post(`${BASE_URL}/users/${this.username}/favorites/${storyId}`, {
			token: this.loginToken
		});

		await this.refreshData();
	}

	/**
	 * Removes the specified story ID from the user's favorites
	 * @param  storyId Story ID
	 */
	async deleteFavorite(storyId) {
		if (!this.loginToken || !storyId) return null;

		// call the API
		const response = await axios.delete(`${BASE_URL}/users/${this.username}/favorites/${storyId}`, {
			params: {
				token: this.loginToken
			}
		});

		await this.refreshData();
	}

	/**
	 * Refreshes user data from the server
	 */
	async refreshData() {
		// call the API
		const response = await axios.get(`${BASE_URL}/users/${this.username}`, {
			params: {
				token: this.loginToken
			}
		});

		let updatedUserData = User.getUserFromResponse(response);

		this.updatedAt = updatedUserData.updatedAt;
		this.favoritesMap = updatedUserData.favoritesMap;
		this.ownStoryMap = updatedUserData.ownStoryMap;
	}

	/** Get user instance for the logged-in-user.
	 *
	 * This function uses the token & username to make an API request to get details
	 *   about the user. Then it creates an instance of user with that info.
	 */

	static async getLoggedInUser(token, username) {
		// if we don't have user info, return null
		if (!token || !username) return null;

		// call the API
		const response = await axios.get(`${BASE_URL}/users/${username}`, {
			params: {
				token
			}
		});

		let user = User.getUserFromResponse(response);
		user.loginToken = token;

		return user;
	}
}

/**
 * Class to represent a single story.
 */

class Story {

	/**
	 * The constructor is designed to take an object for better readability / flexibility
	 * - storyObj: an object that has story properties in it
	 */

	constructor(storyObj) {
		this.author = storyObj.author;
		this.title = storyObj.title;
		this.url = storyObj.url;
		this.username = storyObj.username;
		this.storyId = storyObj.storyId;
		this.createdAt = storyObj.createdAt;
		this.updatedAt = storyObj.updatedAt;
	}
}