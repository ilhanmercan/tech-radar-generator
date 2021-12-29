/* eslint no-constant-condition: "off" */

const d3 = require('d3')
const _ = {
  map: require('lodash/map'),
  uniqBy: require('lodash/uniqBy'),
  capitalize: require('lodash/capitalize'),
  each: require('lodash/each'),
  intersection: require('lodash/intersection')
}

const InputSanitizer = require('./inputSanitizer')
const Radar = require('../models/radar')
const Quadrant = require('../models/quadrant')
const Ring = require('../models/ring')
const Blip = require('../models/blip')
const GraphingRadar = require('../graphing/radar')
const MalformedDataError = require('../exceptions/malformedDataError')
const ExceptionMessages = require('./exceptionMessages')

const { blips: rawBlips, quadrants: quadrantsOrder, rings, title } = require('../data')
const blips = _.map(rawBlips, new InputSanitizer().sanitize)

function plotRadar () {
  document.title = title
  d3.selectAll('.loading').remove()

  const ringsInData = _.intersection(rings, _.map(_.uniqBy(blips, 'ring'), 'ring'))
  var ringMap = {}
  const maxRings = 4

  _.each(ringsInData, function (ringName, i) {
    if (i === maxRings) {
      throw new MalformedDataError(ExceptionMessages.TOO_MANY_RINGS)
    }
    ringMap[ringName] = new Ring(ringName, i)
  })

  var quadrants = {}
  _.each(blips, function (blip) {
    if (!quadrants[blip.quadrant]) {
      quadrants[blip.quadrant] = new Quadrant(_.capitalize(blip.quadrant))
    }
    quadrants[blip.quadrant].add(new Blip(blip.name, ringMap[blip.ring], blip.isNew.toLowerCase() === 'true', blip.topic, blip.description))
  })

  var radar = new Radar()
  _.each(quadrantsOrder, function (quadrant) {
    if (quadrants[quadrant]) {
      radar.addQuadrant(quadrants[quadrant])
    }
  })

  var size = (window.innerHeight - 133) < 620 ? 620 : window.innerHeight - 133

  new GraphingRadar(size, radar).init().plot()
}

const SafePlotRadar = function () {
  try {
    plotRadar()
  } catch (exception) {
    plotErrorMessage(exception)
  }
}

function plotBanner (content, text) {
  content.append('div')
    .attr('class', 'input-sheet__banner')
    .html(text)
}

function plotErrorMessage (exception) {
  var content = d3.select('body')
    .append('div')
    .attr('class', 'input-sheet')

  // var bannerText = '<div><h1>Build your own radar</h1><p>Once you\'ve <a href ="https://www.thoughtworks.com/radar/byor">created your Radar</a>, you can use this service' +
  //   ' to generate an <br />interactive version of your Technology Radar. Not sure how? <a href ="https://www.thoughtworks.com/radar/how-to-byor">Read this first.</a></p></div>'

  plotBanner(content, '')

  d3.selectAll('.loading').remove()
  const message = 'Oops! It seems like there are some problems with loading your data. '
  var faqMessage = 'Please check <a href="https://www.thoughtworks.com/radar/how-to-byor">FAQs</a> for possible solutions.'
  console.error(exception)

  const container = content.append('div').attr('class', 'error-container')
  var errorContainer = container.append('div')
    .attr('class', 'error-container__message')
  errorContainer.append('div').append('p')
    .html(message)
  errorContainer.append('div').append('p')
    .html(faqMessage)

  var homePageURL = window.location.protocol + '//' + window.location.hostname
  homePageURL += (window.location.port === '' ? '' : ':' + window.location.port)
  var homePage = '<a href=' + homePageURL + '>GO BACK</a>'

  errorContainer.append('div').append('p')
    .html(homePage)
}

module.exports = SafePlotRadar
