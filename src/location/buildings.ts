export type LatLngPoint = {
latitude: number;
longitude: number;
};

export type BuildingPolygon = {
id: string;
name: string;
fullName?: string;
osmWayId: number;
polygon: LatLngPoint[];
};

export const NUS_INFORMATION_TECHNOLOGY: BuildingPolygon = {
id: "IT",
name: "Information Technology",
fullName: "NUS Information Technology",
osmWayId: 54583488,
polygon: [
{ latitude: 1.2977840, longitude: 103.7722665 },
{ latitude: 1.2977090, longitude: 103.7724778 },
{ latitude: 1.2976917, longitude: 103.7725265 },
{ latitude: 1.2976068, longitude: 103.7727657 },
{ latitude: 1.2975779, longitude: 103.7728471 },
{ latitude: 1.2974851, longitude: 103.7728148 },
{ latitude: 1.2973195, longitude: 103.7727572 },
{ latitude: 1.2973231, longitude: 103.7727517 },
{ latitude: 1.2973318, longitude: 103.7727189 },
{ latitude: 1.2974201, longitude: 103.7724643 },
{ latitude: 1.2973558, longitude: 103.7724425 },
{ latitude: 1.2973876, longitude: 103.7723421 },
{ latitude: 1.2974619, longitude: 103.7723655 },
{ latitude: 1.2975269, longitude: 103.7721818 },
{ latitude: 1.2977840, longitude: 103.7722665 },
],
};

export const E4_BUILDING: BuildingPolygon = {
id: "E4",
name: "E4",
fullName: "Engineering 4",
osmWayId: 139970613,
polygon: [
{ latitude: 1.2981520, longitude: 103.7728000 },
{ latitude: 1.2983197, longitude: 103.7728594 },
{ latitude: 1.2983502, longitude: 103.7727709 },
{ latitude: 1.2984114, longitude: 103.7727928 },
{ latitude: 1.2984526, longitude: 103.7728075 },
{ latitude: 1.2984716, longitude: 103.7727548 },
{ latitude: 1.2984304, longitude: 103.7727402 },
{ latitude: 1.2983662, longitude: 103.7727174 },
{ latitude: 1.2984557, longitude: 103.7724749 },
{ latitude: 1.2984880, longitude: 103.7724863 },
{ latitude: 1.2985642, longitude: 103.7722707 },
{ latitude: 1.2985912, longitude: 103.7721912 },
{ latitude: 1.2986505, longitude: 103.7720242 },
{ latitude: 1.2986911, longitude: 103.7719098 },
{ latitude: 1.2988123, longitude: 103.7718526 },
{ latitude: 1.2989852, longitude: 103.7717710 },
{ latitude: 1.2990133, longitude: 103.7717576 },
{ latitude: 1.2990557, longitude: 103.7717376 },
{ latitude: 1.2990504, longitude: 103.7717263 },
{ latitude: 1.2992020, longitude: 103.7716548 },
{ latitude: 1.2992452, longitude: 103.7716342 },
{ latitude: 1.2992685, longitude: 103.7716233 },
{ latitude: 1.2992495, longitude: 103.7715831 },
{ latitude: 1.2992247, longitude: 103.7715306 },
{ latitude: 1.2990508, longitude: 103.7716127 },
{ latitude: 1.2990190, longitude: 103.7715455 },
{ latitude: 1.2986913, longitude: 103.7717011 },
{ latitude: 1.2986395, longitude: 103.7717256 },
{ latitude: 1.2985392, longitude: 103.7717722 },
{ latitude: 1.2984803, longitude: 103.7719369 },
{ latitude: 1.2984016, longitude: 103.7721534 },
{ latitude: 1.2983892, longitude: 103.7721873 },
{ latitude: 1.2983065, longitude: 103.7724146 },
{ latitude: 1.2982743, longitude: 103.7724543 },
{ latitude: 1.2982007, longitude: 103.7726607 },
{ latitude: 1.2981842, longitude: 103.7727068 },
{ latitude: 1.2981520, longitude: 103.7728000 },
],
};

export const E5_BUILDING: BuildingPolygon = {
id: "E5",
name: "E5",
fullName: "Engineering 5",
osmWayId: 54583929,
polygon: [
{ latitude: 1.2982692, longitude: 103.7720034 },
{ latitude: 1.2982371, longitude: 103.7720946 },
{ latitude: 1.2982229, longitude: 103.7721287 },
{ latitude: 1.2981636, longitude: 103.7722984 },
{ latitude: 1.2981384, longitude: 103.7722873 },
{ latitude: 1.2980246, longitude: 103.7725977 },
{ latitude: 1.2980076, longitude: 103.7726439 },
{ latitude: 1.2978999, longitude: 103.7729379 },
{ latitude: 1.2977419, longitude: 103.7728843 },
{ latitude: 1.2977632, longitude: 103.7728210 },
{ latitude: 1.2978502, longitude: 103.7725847 },
{ latitude: 1.2978678, longitude: 103.7725378 },
{ latitude: 1.2980754, longitude: 103.7719852 },
{ latitude: 1.2980932, longitude: 103.7719379 },
{ latitude: 1.2981490, longitude: 103.7719601 },
{ latitude: 1.2982692, longitude: 103.7720034 },
],
};

export const BIZ2_BUILDING: BuildingPolygon = {
id: "BIZ2",
name: "BIZ2",
fullName: "Business 2",
osmWayId: 54619697,
polygon: [
{ latitude: 1.2940206, longitude: 103.7746736 },
{ latitude: 1.2935286, longitude: 103.7749016 },
{ latitude: 1.2934604, longitude: 103.7750867 },
{ latitude: 1.2934217, longitude: 103.7751919 },
{ latitude: 1.2933596, longitude: 103.7753603 },
{ latitude: 1.2933396, longitude: 103.7754147 },
{ latitude: 1.2933191, longitude: 103.7754704 },
{ latitude: 1.2932609, longitude: 103.7756282 },
{ latitude: 1.2930885, longitude: 103.7755647 },
{ latitude: 1.2932438, longitude: 103.7751430 },
{ latitude: 1.2932935, longitude: 103.7750081 },
{ latitude: 1.2933835, longitude: 103.7747639 },
{ latitude: 1.2933895, longitude: 103.7747611 },
{ latitude: 1.2934106, longitude: 103.7747514 },
{ latitude: 1.2935060, longitude: 103.7747071 },
{ latitude: 1.2935449, longitude: 103.7746891 },
{ latitude: 1.2937922, longitude: 103.7745744 },
{ latitude: 1.2939424, longitude: 103.7745047 },
{ latitude: 1.2939698, longitude: 103.7745637 },
{ latitude: 1.2939805, longitude: 103.7745869 },
{ latitude: 1.2940206, longitude: 103.7746736 },
],
};

export const HON_SUI_SEN_MEMORIAL_LIBRARY_BUILDING: BuildingPolygon = {
id: "HSSML",
name: "Hon Sui Sen Memorial Library",
fullName: "NUS Hon Sui Sen Memorial Library",
osmWayId: 54619685,
polygon: [
{ latitude: 1.2927088, longitude: 103.7743161 },
{ latitude: 1.2927616, longitude: 103.7742897 },
{ latitude: 1.2928863, longitude: 103.7742275 },
{ latitude: 1.2929058, longitude: 103.7742758 },
{ latitude: 1.2929882, longitude: 103.7742355 },
{ latitude: 1.2929514, longitude: 103.7741530 },
{ latitude: 1.2930774, longitude: 103.7740960 },
{ latitude: 1.2931062, longitude: 103.7741510 },
{ latitude: 1.2931317, longitude: 103.7741383 },
{ latitude: 1.2931900, longitude: 103.7742664 },
{ latitude: 1.2932737, longitude: 103.7742375 },
{ latitude: 1.2933360, longitude: 103.7743753 },
{ latitude: 1.2932819, longitude: 103.7744018 },
{ latitude: 1.2932698, longitude: 103.7743777 },
{ latitude: 1.2931820, longitude: 103.7744199 },
{ latitude: 1.2931666, longitude: 103.7743911 },
{ latitude: 1.2931123, longitude: 103.7744192 },
{ latitude: 1.2931897, longitude: 103.7745881 },
{ latitude: 1.2932368, longitude: 103.7746929 },
{ latitude: 1.2931313, longitude: 103.7747466 },
{ latitude: 1.2930774, longitude: 103.7747740 },
{ latitude: 1.2930546, longitude: 103.7747297 },
{ latitude: 1.2929956, longitude: 103.7747585 },
{ latitude: 1.2929796, longitude: 103.7747256 },
{ latitude: 1.2929233, longitude: 103.7747535 },
{ latitude: 1.2927088, longitude: 103.7743161 },
],
};

export const BUILDINGS: BuildingPolygon[] = [
NUS_INFORMATION_TECHNOLOGY,
E4_BUILDING,
E5_BUILDING,
BIZ2_BUILDING,
HON_SUI_SEN_MEMORIAL_LIBRARY_BUILDING,
];

export const BUILDINGS_BY_ID: Record<string, BuildingPolygon> = Object.fromEntries(
BUILDINGS.map((building) => [building.id, building])
);