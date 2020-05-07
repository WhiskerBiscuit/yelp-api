const http = require('http');
const https = require('https');

const hostname = '127.0.0.1';
const port = 3000;
const API_KEY = '7QUq_NkFv2aqzrdblvWKhXDEL1KMHdAl_Y5RF6glmduLEO8-xRobQCW_LPbMOtzY-PX6phHHx81wR2JvtT9uZnNdeWKuu3TMGTSzzFtzvEnbLrZQXknwvp-x1cuyXnYx';

/**
 * @param {String} category
 * @param {String} location
 * @returns {Promise}
 */
const getBusinessesForCategory = (category, location) => {
	return new Promise((resolve, reject) => {
		https.get(`https://api.yelp.com/v3/businesses/search?categories=${category}&location=${location}&limit=5&sort_by=rating&radius=4000`, {
				headers: { 'Authorization': `Bearer ${API_KEY}` }
			}, (resp) => {
				let data = '';
				resp.on('data', (chunk) => {
					data += chunk;
				});
				resp.on('end', () => {
					const { businesses } = JSON.parse(data);
					const responseData = [];
					if (businesses && businesses.length) {
						for (let i = 0; i < businesses.length; i++) {
							responseData.push({
								address: businesses[i].location.address1,
								city: businesses[i].location.city,
								id: businesses[i].id,
								name: businesses[i].name,
							});
						};
					}
					resolve(responseData);
				});
			}).on('error', (err) => {
				reject(err);
			});
	})
};

/**
 * @param {String} businessId
 * @returns {Promise}
 */
const getReviewForBusiness = (businessId) => {
	return new Promise((resolve, reject) => {
		https.get(`https://api.yelp.com/v3/businesses/${businessId}/reviews`, {
				headers: { 'Authorization': `Bearer ${API_KEY}` }
			}, (resp) => {
				let data = '';
				resp.on('data', (chunk) => {
					data += chunk;
				});
				resp.on('end', () => {
					const { reviews } = JSON.parse(data);
					let responseData = {};
					if (reviews && reviews.length) {
						responseData = {
							author: reviews[0].user.name,
							excerpt: reviews[0].text
						};
					};
					resolve(responseData);
				});
			}).on('error', (err) => {
				reject(err);
			});
	});
};

/**
 * @param {Array.<Object>} businesses
 * @returns {Promise}
 */
const getReviewsForBusinesses = (businesses) => {
	const promises = [];
	if (businesses && businesses.length) {
		for (let i = 0; i < businesses.length; i++) {
			promises.push(getReviewForBusiness(businesses[i].id));
		}
	}
	return Promise.all(promises)
		.then((reviews) => {
			const responseData = [];
			if (reviews && reviews.length && businesses && businesses.length) {
				for (let i = 0; i < businesses.length; i++) {
					responseData.push({
						...businesses[i],
						...reviews[i]
					});
				}
			}
			return responseData;
		});
};

/**
 * @param {Array.<Object>} businesses
 * @returns {String}
 */
const generateHTML = (businesses) => {
	const items = businesses && businesses.length ? businesses.map((business) => (
		`<li class="c-business-list__item">
			<ul class="c-business">
				<li class="c-business__name">${business.name}</li>
				<li class="c-business__address">${business.address}</li>
				<li class="c-business__city">${business.city}</li>
				<li class="c-business__review">${business.excerpt}</li>
				<li class="c-business__author">${business.author}</li>
			</ul>
		</li>`
	)).join('') : `<li>No businesses found, please try again later</li>`;
	return `
		<!DOCTYPE html>
		<html>
			<head>
				<style>
					h1 {
						margin: 0.5rem;
					}
					ul {
						list-style-type: none;
						margin: 0;
						padding: 0;
					}
					.c-business-list {
						padding: 1rem;
					}
					.c-business {
						border-radius: 0.5rem;
						box-shadow: 0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12);
						padding: 0.5rem;
					}
					.c-business-list__item {
						margin-top: 0.5rem;
					}
					.c-business-list__item:first-child {
						margin-top: 0;
					}
					.c-business__name {
						font-size: 1.5rem;
					}
					.c-business__review {
						margin-top: 0.5rem;
					}
					.c-business__author {
						font-size: 0.75rem;
					}
				</style>
			</head>
			<body>
				<h1>Ice Cream Shops in Alpharetta, GA</h1>
				<ul class="c-business-list">${items}</ul>
				<!-- Seed data for possible React app -->
				<script type="text/javascript">
					window.__APP_DATA__ = ${JSON.stringify(businesses)};
				</script>
			</body>
		</html>`;
};

const server = http.createServer((req, res) => {
	getBusinessesForCategory('icecream', 'alpharetta,%20ga')
		.then(getReviewsForBusinesses)
		.then(generateHTML)
		.then((html) => {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/html');
			res.end(html);
		})
		.catch((err) => {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/html');
			res.end(JSON.stringify(err));
		});
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
