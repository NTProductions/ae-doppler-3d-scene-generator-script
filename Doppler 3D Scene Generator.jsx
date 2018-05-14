// Dopper 3D Scene Generator
// Take a scene of layers, and spread them in 3d space, adds camera

var mainWindow = new Window("palette", "3D Scene Generator", undefined);
mainWindow.orientation = "column";

var groupOne = mainWindow.add("group", undefined, "groupOne");
groupOne.orientation = "row";
var dopplerCheckbox = groupOne.add("checkbox", undefined, "Use Doppler for Z-Pos");
dopplerCheckbox.value = true;
var fixAnchorCheckbox = groupOne.add("checkbox", undefined, "Center Anchor Points");
fixAnchorCheckbox.value = true;

var groupTwo = mainWindow.add("group", undefined, "groupTwo");
groupTwo.orientation = "row";
var backgroundLayerDropDown = groupTwo.add("dropdownlist", undefined, ["None", "Bottom Layer"]);
backgroundLayerDropDown.selection = 1;

var groupThree = mainWindow.add("group", undefined, "groupTwo");
groupThree.orientation = "row";
var generateButton = groupThree.add("button", undefined, "Generate");

mainWindow.center();
mainWindow.show();

// global vars
var minDistance = 0;
var maxDistance = 10000;

generateButton.onClick = function() {
        if(app.project.activeItem == null || app.project.activeItem == undefined) {
                alert("Please select a composition");
                return false;
            }
        if(app.project.activeItem.numLayers < 2) {
                alert("Your composition has less than 2 layers", "Please add more layers");
                return false;
            }
        else {
                main(app.project.activeItem, dopplerCheckbox.value, fixAnchorCheckbox.value, backgroundLayerDropDown.selection.index);
            }
    }

function main(comp, dopplerBool, anchorBool, backgroundIndex) {
    app.beginUndoGroup("Scene Generation");
        var layerArray = getLayers(comp, backgroundIndex);
        // layerArray[0] == threeDLayers
        // layerArray[1] == bgLayer
        
        generateCamera(comp);
        
        if(anchorBool == true) {
                centerAnchorPoints(layerArray[0]);
            }
        if(dopplerBool == false) {
                randomPositions(layerArray[0], layerArray[1]);
            } else {
                dopplerPositions(layerArray[0], layerArray[1], comp);
                }
    app.endUndoGroup();
    }

function getLayers(comp, bgIndex) {
    var threeDLayers = [];
    var threeDLayersNames = [];
    var bgLayer;
    switch(bgIndex) {
        case 0:
            bgLayer = null;
        break;
        case 1:
            bgLayer = comp.layer(comp.numLayers);
        break;
        default:
            bgLayer = null;
        break;
        }
    for(var i = 1; i <= comp.numLayers; i++) {
            if(bgLayer == null) {
                threeDLayers.push(comp.layer(i));
                threeDLayersNames.push(comp.layer(i).name);
                }
            if(bgLayer != null && i != comp.numLayers) {
                    threeDLayers.push(comp.layer(i));
                    threeDLayersNames.push(comp.layer(i).name);
                    
                }
        }
    return [threeDLayers, bgLayer];
    }

function generateCamera(comp) {
    comp.layers.addCamera("3D Scene Camera", [comp.width/2, comp.height/2]);
    }

function centerAnchorPoints(layers) {
    for(var i = 0; i < layers.length; i++) {
        var thisPosition = calculatePosition(layers[i]);
        if(thisPosition[3] == true) {
        layers[i].property("Position").setValue([thisPosition[0], thisPosition[1]]);
        layers[i].property("Anchor Point").setValue([thisPosition[0] * thisPosition[2], thisPosition[1] * thisPosition[2]]);
        }
    }
    }

function calculatePosition(layer) {
    var maskBool = false;
    if(layer.property("Masks").property("Mask 1") != null) {
        maskBool = true;
    var thisPath = layer.property("Masks").property("Mask 1").property("Mask Path");
    var numVerts = thisPath.value.vertices.length;
    var vertArrayX = [];
    var vertArrayY = [];
  
    for(var i = 0; i < numVerts / 2; i++) {
        vertArrayX.push(thisPath.value.vertices[i][0]);
        vertArrayY.push(thisPath.value.vertices[i][1]);
        }
    vertArrayX.sort(function(a, b){return a - b});
    vertArrayY.sort(function(a, b){return a - b});

    var calculatedX = (vertArrayX[0] + vertArrayX[vertArrayX.length-1]) / 2;
    var calculatedY = (vertArrayY[0] + vertArrayY[vertArrayY.length-1]) / 2;
    var factor = app.project.activeItem.width / layer.sourceRectAtTime(0, false).width;
    }
return [calculatedX*factor, calculatedY*factor, 1/factor, maskBool];
    }

function randomPositions(layers, bgLayer) {
    // turn on three d for layers
    for(var i = 0; i < layers.length; i++) {
    var thisPos = layers[i].property("Position").value;
    layers[i].threeDLayer = true;
    layers[i].property("Position").setValue([thisPos[0], thisPos[1], Math.floor((Math.random() * maxDistance) + minDistance)]);
    }
if(bgLayer != null) {
    if(backgroundLayerDropDown.selection.index == 1) {
        bgLayer.property("Scale").setValue([750, 750]);
        bgLayer.threeDLayer = true;
        }
        bgLayer.property("Position").setValue([bgLayer.property("Position").value[0], bgLayer.property("Position").value[1], maxDistance]);
        
    }
}

function dopplerPositions(layers, bgLayer, comp) {
        var theseBounds, shift, currentLayer, pointControl, point, ogPos;
        // 0 == minDistance/Blue Tinted
        // 255 == maxDistance/Red Tinted
    for(var i = 0; i < layers.length; i++) {
            currentLayer = layers[i];
        
        var alphaText = comp.layers.addText();
        var alphaSourceText = alphaText.property("Source Text");
        alphaSourceText.expression = 'targetLayer = thisComp.layer("' + currentLayer.name + '"); samplePoint = targetLayer.effect("Point Control")("Point"); sampleRadius = [1,1]; sampledColor_8bpc = 255 * targetLayer.sampleImage(samplePoint, sampleRadius); A = Math.round(sampledColor_8bpc[3]); outputString = A';
        var redText = comp.layers.addText();
        var redSourceText = redText.property("Source Text");
        redSourceText.expression = 'targetLayer = thisComp.layer("' + currentLayer.name + '"); samplePoint = targetLayer.effect("Point Control")("Point"); sampleRadius = [1,1]; sampledColor_8bpc = 255 * targetLayer.sampleImage(samplePoint, sampleRadius); R = Math.round(sampledColor_8bpc[0]); outputString = R';
        
        pointControl = currentLayer.Effects.addProperty("ADBE Point Control");
        point = currentLayer("Effects")("Point Control")("Point");
        theseBounds = calculateBounds(currentLayer);
        shift = calculateShift(currentLayer, theseBounds, redSourceText, point, alphaSourceText);
        currentLayer.threeDLayer = true;
        currentLayer.property("Position").setValue(shift);
        
        redText.remove();
        pointControl.remove();
        alphaText.remove();
}
}


function calculateBounds(layer) {
    var bounds = [];
    
    var myMask = layer.Masks.property("Mask 1");
    var myPath = myMask.property("Mask Path").value;
    var factor = layer.property("Position").value[0] / layer.property("Anchor Point").value[0];
    var tempX = [];
    var tempY = [];
    
    for(var i = 0; i < myPath.vertices.length; i++) {
            tempX.push(Math.floor(myPath.vertices[i][0]));
            tempY.push(Math.floor(myPath.vertices[i][1]));
        }
    tempX.sort(function(a, b){return a - b});
    tempY.sort(function(a, b){return a - b});
    
    var firstX = tempX[0];
    var lastX = tempX[tempX.length-1];
    var firstY = tempY[0];
    var lastY = tempY[tempY.length-1];
   
   bounds = [firstX, lastX, firstY, lastY];
     
    return bounds;
    }

function calculateShift(layer, bounds, sourceText, point, alphaSourceText) {
    var shiftAmount;
    var theseReds = [];
    $.writeln(bounds);
    for(var i = bounds[0]; i < bounds[1]; i+=5) {
        for(var e = bounds[2]; e < bounds[3]; e+=5) {

            //alert(sourceText.value);
            point.setValue([i, e]);
            if(parseInt(alphaSourceText.value) != 0) {
            theseReds.push(parseInt(sourceText.value));
            }
            }
        }
    shiftAmount = [layer.property("Position").value[0], layer.property("Position").value[1], shiftToZPos(theseReds)];
    return shiftAmount;
    }

function shiftToZPos(redValuesArray) {
    var average = 0;
    var sum = 0;
    var counter = 0;
    if(redValuesArray.length > 0) {
        $.writeln(redValuesArray.length);
    for(var i = 0; i < redValuesArray.length; i++) {
        sum+=parseInt(redValuesArray[i]);
        counter++;
        }
    average = sum / counter;
    
    } else {
        $.writeln("average is Nan");
            average = Math.floor((Math.random() * 255) + 1);
    }
    $.writeln("average is : " + average);
    
    return rgbToZPos(average);
    }

function rgbToZPos(input) {
    return ((input - 0) / (255 - 0)) * (maxDistance - minDistance) + minDistance;
    }