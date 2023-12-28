const setCustomProp = (element, prop, value) => {
  element && element.setAttribute(prop, value)
}

const callback = () => {

  // Variables, constants and DOM elements
  const signals = [
    'turnLeft', 'turnRight', 'battAlt', 'eBrake', 'highBeam', 'parkLights',
    'fogLights', 'auxLights', 'openDoor', 'fan', 'oilSwitch', 'ECUErr'
  ];
  const elems = [
    ...signals, 'container', 'speedo', 'rpm', 'kmTrip', 'kmTotal', 'fuelLevel',
    'battLevel', 'fuelPressure', 'lambda', 'oilPressure', 'mapBoost', 'cltNow'
  ].reduce((acc, id) => ({ ...acc, [id]: document.getElementById(id) }), {});
  const {
    container, speedo, rpm, kmTrip, kmTotal, battLevel,
    fuelPressure, lambda, oilPressure, mapBoost, fuelLevel, cltNow
  } = elems;
  const { cMain, cSec, cRed, cRpm } = COLORS
  const { aSpd, redline, icon } = DASH_OPTIONS
  const maxRPM = 8000;
  let [useCAN, useCANForRPM, useCANForVSS, useCANForCLT] = [false, false, false, false]

  // Set static parameters
  setRootCSS('--background-color', cMain);
  setRootCSS('--mini-bar', `90deg, ${cMain}33, ${cMain}FF`);
  setRootCSS('--mini-bar-red', `90deg, ${cSec}33, ${cSec}FF`);
  setRootCSS('--mini-bar-rpm', `90deg, #fff, #fff`);

  // Load odometer
  loadOdo(kmTotal, kmTrip, 0)

  // Wrapper method to update the RPM
  const updateRPM = (value) => {
    // setText(rpm, zeroFixed(60))
    setCustomProp(rpm, 'style', `--rpm:${value / 100}`)
    setCustomProp(rpm, 'rpm-value', Number(value / 100).toFixed(0))
    setCustomProp(rpm, 'rotation-up', value > 7000 ? 'true' : 'false')
    setRootCSS('--mini-bar-rpm', +value < redline ? `90deg, ${cRpm}33, ${cRpm}ff` : `90deg, #fff, ${cRed}`)
    if (+value > maxRPM) return
    setRootCSS('--rpm-deg', `${-(155 + ((+value / maxRPM) * 230))}deg`)
    setRootCSS('--background-color', (+value < redline ? cMain : cRed));
  }

  // Wrapper method to update the speedometer
  const setKmhDeg = ([val, valf]) => {
    setText(speedo, zeroFixed(aSpd < 2 ? (valf || val) : val))
    if (checkCache('kmh-deg', val) || val > 160) return
    setRootCSS('--kmh-deg', `${(155 + ((val / 160) * 230))}deg`)
  }

  // Cache the settings for channel sources locally
  const checkSource = () => [useCAN, useCANForRPM, useCANForVSS, useCANForCLT] = [
    useCanChannel(),
    useCanChannel('sRpm'),
    useCanChannel('sVss'),
    useCanChannel('sClt'),
  ]

  // Bind the realtime data to the DOM
  const bindRealtimeData = () => {

    basicData = window.CAN_SIMULATE;

    // Check if the source has changed and update the cache
    if (!checkCache('useCAN', useCanChannel())) checkSource();

    // Update the data for CAN-only channels - batching methods for performance
    if (useCAN) {
      setText(mapBoost, mapFormat(canData.map))
      setText(fuelPressure, canData.fuelPress)
      setText(battLevel, canData.batt)
      setText(lambda, canData.lambda)
      setText(oilPressure, canData.oilPress)
    }

    // Update the data for Basic-only channels
    if (isBasicOnline) {

      // setText(fuelLevel, fuelLevelFormat(basicData, 'lvlFuel'))
      // setFuelLevelBar(safeReturn(basicData, 'lvlFuel'))
      if (Math.round(basicData.lvlFuel / 10) > 8) {
        setCustomProp(fuelLevel, 'nivel', 8)
      } else {
        setCustomProp(fuelLevel, 'nivel', Math.round(basicData.lvlFuel / 10))
      }

      // Toggle signals
      for (let i = 0; i < signals.length; i++) {
        etoggle(elems[signals[i]], basicData[signals[i]])
      }
    }

    // Update the data for channels that can be sourced from CAN or Basic servers
    updateRPM(useCANForRPM ? canData.rpm : safeReturn(basicData, 'rpm'))
    setKmhDeg(useCANForVSS ? [canData.vss] : [basicData.kmh, basicData.kmhF])
    setCLTBar(useCANForCLT ? canData.clt : safeReturn(basicData, 'clt'))
    updateOdo(kmTotal, kmTrip, useCANForVSS ? canData.odoNow : basicData.odoNow)

    // setText(cltNow, useCANForCLT ? canData.clt : zeroFixed(safeReturn(basicData, 'clt')))
    // console.log({ useCANForCLT, canData, actual: zeroFixed(safeReturn(basicData, 'clt')), basicData })
    const tempLvl = useCANForCLT ? canData.clt : zeroFixed(safeReturn(basicData, 'clt'))
    setCustomProp(cltNow, 'nivel', Math.round(tempLvl / 10) > 8 ? 8 : Math.round(tempLvl / 10))
    switch (true) {
      case Math.round(tempLvl / 10) > 8:
        setCustomProp(cltNow, 'nivel', 8)
        break;
      case Math.round(tempLvl / 10) > 4:
        setCustomProp(cltNow, 'style', '--temp-bar-color: red;')
        setCustomProp(cltNow, 'danger', 'true')
        setCustomProp(cltNow, 'nivel', Math.round(tempLvl / 10))
        break;
      default:
        setCustomProp(cltNow, 'nivel', Math.round(tempLvl / 10))
        setCustomProp(cltNow, 'style', `--temp-bar-color: #fff;`)
        setCustomProp(cltNow, 'danger', 'false')
        break;
    }

    // Repeat bindRealtimeData as fast as possible
    requestAnimationFrame(bindRealtimeData);
  }

  // Replace the icons with the colored ones
  (() => {
    if (icon === 1) return
    const icons = document.querySelectorAll('#top-info img')
    for (let i = 0; i < icons.length; i++) {
      icons[i].src = icons[i].src.replace('icons', 'icons_color')
    }
  })()

  // Wait animations to finish and then open websocket connection
  setTimeout(() => openConnection(bindRealtimeData), 6500)

  // Trigger animation when DOM is ready
  container.classList.add('anim-in')
};

// Start the script when DOM is ready
window.onload = () => callback()
